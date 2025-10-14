import React, { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import CodeMirrorEditor from './components/CodeMirrorEditor'
import { openFolderPicker } from './drive/picker'
import { loadDriveState, clearDriveState } from './drive/state'
import { listFountainFilesInFolder, listFilesInFolder, getFileContent, createFileInFolder, updateFileContent } from './drive/files'
import { persistDriveState } from './drive/persistence'
import { usePreviewWorker } from './hooks/usePreviewWorker'
import { usePlayerWorker } from './hooks/usePlayerWorker'
import defaultScriptContent from './assets/defaultScript.fountain?raw'

// Main App component
function App() {
  const [showDesktopSuggestion, setShowDesktopSuggestion] = useState(false)
  const [code, setCode] = useState('')
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState('edit') // 'edit' or 'preview'
  const [currentLine, setCurrentLine] = useState(0)
  const [hasSavedScript, setHasSavedScript] = useState(false)
  const [lastSavedDate, setLastSavedDate] = useState(null)
  const [gdriveOn, setGdriveOn] = useState(() => {
    try {
      return localStorage.getItem('fountain:gdriveOn') === '1'
    } catch (e) {
      return false
    }
  })
  const [driveState, setDriveState] = useState(() => loadDriveState())
  // Merge persisted drive state (localStorage) with App reactive state so the
  // toolbar always reflects the up-to-date values. This prevents cases where
  // localStorage has a fileName but React state hasn't been updated yet.
  const persistedDriveState = { ...(loadDriveState() || {}), ...(driveState || {}) }

  // Ensure App updates when files are selected/cleared elsewhere (picker/modal)
  useEffect(() => {
    const onFileSelected = (e) => {
      try {
        const detail = e && e.detail ? e.detail : null
        if (detail && detail.id) {
          const next = { ...loadDriveState(), fileId: detail.id, fileName: detail.name, file: detail }
          try { persistDriveState(next) } catch (err) { console.error('App: persistDriveState failed', err) }
          setDriveState(next)
        }
      } catch (err) { console.error('App: fileSelected handler failed', err) }
    }
    const onFileCleared = () => {
      try {
        const s = loadDriveState() || {}
        const next = { ...s, fileId: undefined, fileName: undefined, file: undefined }
        try { persistDriveState(next) } catch (err) { console.error('App: persistDriveState failed', err) }
        setDriveState(next)
      } catch (err) { console.error('App: fileCleared handler failed', err) }
    }
    window.addEventListener('fountain:drive:fileSelected', onFileSelected)
    window.addEventListener('fountain:drive:fileCleared', onFileCleared)
    return () => {
      window.removeEventListener('fountain:drive:fileSelected', onFileSelected)
      window.removeEventListener('fountain:drive:fileCleared', onFileCleared)
    }
  }, [])
  // Consider both persisted localStorage state and in-memory driveState so buttons
  // reflect a folder selected in a different context (picker/fallback persist).
  const hasDriveFolder = !!(persistedDriveState && (persistedDriveState.folderId || persistedDriveState.folderName))
  // Deterministic source-of-truth from persisted storage to avoid HMR/in-memory divergences
  const _storedDriveState = loadDriveState() || {}
  const storedHasDriveFolder = !!(_storedDriveState.folderId || _storedDriveState.folderName)
  const previewRef = useRef(null)
  const editorRef = useRef(null)
  const blocksRef = useRef([])
  const appRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // GDrive Load modal state
  const [isGDriveLoadOpen, setIsGDriveLoadOpen] = useState(false)
  const [gdriveFiles, setGdriveFiles] = useState([])
  const [gdriveFolderName, setGdriveFolderName] = useState(null)
  const [gdriveLoading, setGdriveLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isReloading, setIsReloading] = useState(false)

  // Log when driveState changes so we can trace why UI doesn't show persisted file
  useEffect(() => {
    // Debug log removed: avoid noisy console output in normal usage
  }, [driveState])

  // When in GDrive mode, show the Drive file's modifiedTime as the lastSavedDate
  useEffect(() => {
    try {
      if (gdriveOn) {
        const s = persistedDriveState || {}
        const fileMeta = s.file || {}
        const mod = fileMeta.modifiedTime || fileMeta.modified_time || null
        if (mod) {
          setLastSavedDate(new Date(mod))
          setHasSavedScript(true)
        }
      }
    } catch (e) {
      // ignore
    }
  }, [gdriveOn, driveState])

  // Load script content on component mount - prioritize localStorage over default
  useEffect(() => {
    const savedData = localStorage.getItem('fountain-script')
    let scriptToLoad = defaultScriptContent // fallback to default
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        scriptToLoad = parsed.content
        setHasSavedScript(true)
        setLastSavedDate(new Date(parsed.savedAt))
      } catch (error) {
        console.error('Error parsing saved script:', error)
        localStorage.removeItem('fountain-script')
        // Will use default script as fallback
      }
    }
    
  setCode(scriptToLoad)
  processText(scriptToLoad)
  try { if (typeof parsePanels === 'function') parsePanels(scriptToLoad) } catch (e) {}
  }, []) // Remove processText dependency to prevent infinite loop

  // Detect mobile-like clients and suggest enabling the browser "Desktop site" option
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('desktopSuggestionDismissed') === '1'
      if (dismissed) return
      const ua = navigator.userAgent || ''
      const isMobileUA = /Mobi|Android|iPhone|iPad|iPod|BB10|IEMobile|Opera Mini/i.test(ua)
      const isTouch = window.matchMedia && window.matchMedia('(pointer:coarse)').matches
      const smallScreen = (window.innerWidth || screen.width || 0) < 1024
      if (isMobileUA || (isTouch && smallScreen)) {
        setShowDesktopSuggestion(true)
      }
    } catch (e) {
      // ignore detection errors
    }
  }, [])

  // Global keyboard handler to toggle GDrive mode (Ctrl/Cmd+G). This keeps
  // the logic centralized in App and allows swapping the persistence toolbar
  // buttons in-place.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'g') {
        e.preventDefault()
        setGdriveOn((v) => {
          try { localStorage.setItem('fountain:gdriveOn', (!v) ? '1' : '0') } catch (err) {}
          return !v
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Persist non-GDrive editor content when switching into GDrive mode, and
  // restore from localStorage (or default script) when switching back to
  // non-GDrive mode. This keeps user's local copy safe whenever they enable
  // Drive persistence.
  useEffect(() => {
    try {
      // On switch to GDrive mode (true): save current code to localStorage
      if (gdriveOn) {
        try {
          const scriptData = {
            content: code || '',
            savedAt: new Date().toISOString()
          }
          localStorage.setItem('fountain-script', JSON.stringify(scriptData))
          // mark that we have a saved script
          setHasSavedScript(true)
          setLastSavedDate(new Date())
          console.log('App: saved local copy to fountain-script before entering GDrive mode')
        } catch (err) {
          console.error('App: failed to persist local script when entering GDrive mode', err)
        }
        // If a Drive file is already selected, asynchronously load it into the editor
        try {
          const ds = loadDriveState() || {}
          const fileId = ds && ds.fileId ? ds.fileId : null
          if (fileId) {
            // mark reloading state while we fetch the Drive file
            setIsReloading(true)
            getFileContent(fileId).then((content) => {
              setCode(content)
              try { processText(content) } catch (e) { console.error('App: processText failed while loading Drive file on toggle', e) }
              setHasSavedScript(true)
              setLastSavedDate(new Date())
              console.log('App: loaded selected Drive file after entering GDrive mode')
            }).catch((err) => {
              console.error('App: failed to load selected Drive file on entering GDrive mode', err)
            }).finally(() => setIsReloading(false))
          }
        } catch (err) {
          console.error('App: error while attempting to load Drive file on toggle', err)
        }
      } else {
        // On switch out of GDrive mode (false): restore local copy if present
        try {
          const savedData = localStorage.getItem('fountain-script')
          if (savedData) {
            const parsed = JSON.parse(savedData)
            const content = parsed && parsed.content ? parsed.content : defaultScriptContent
            setCode(content)
            try { processText(content) } catch (e) { console.error('App: processText failed while restoring local script', e) }
            if (parsed && parsed.savedAt) setLastSavedDate(new Date(parsed.savedAt))
            setHasSavedScript(!!(parsed && parsed.content))
            console.log('App: restored local copy from fountain-script after leaving GDrive mode')
          } else {
            // no saved data; restore default script
            setCode(defaultScriptContent)
            try { processText(defaultScriptContent) } catch (e) { console.error('App: processText failed while loading default script', e) }
            setHasSavedScript(false)
            setLastSavedDate(null)
            console.log('App: no local copy found, loaded default script after leaving GDrive mode')
          }
        } catch (err) {
          console.error('App: failed to restore local script after leaving GDrive mode', err)
        }
      }
    } catch (e) {
      // don't let storage issues break the app
    }
    // Only run when gdriveOn changes intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gdriveOn])

  // Keep App-level driveState in sync with DriveBar / picker events so we
  // can show the selected folder in the persistence toolbar.
  useEffect(() => {
    const handler = (e) => {
      try {
        // @ts-ignore - event detail is untyped
        const detail = e && e.detail ? e.detail : null
        if (detail && detail.id) {
          const next = { ...loadDriveState(), folderId: detail.id, folderName: detail.name, folder: detail }
          try { persistDriveState(next) } catch (err) { console.error('App: persistDriveState failed', err) }
          setDriveState(next)
        } else {
          setDriveState(loadDriveState())
        }
      } catch (err) {
        console.error('App: failed to load drive state', err)
      }
    }
    const onCleared = () => setDriveState({})
    window.addEventListener('fountain:drive:folderSelected', handler)
    window.addEventListener('fountain:drive:cleared', onCleared)
    return () => {
      window.removeEventListener('fountain:drive:folderSelected', handler)
      window.removeEventListener('fountain:drive:cleared', onCleared)
    }
  }, [])

  const { blocks, characters, characterLineCounts, processText } = usePreviewWorker('')
  const { panels, parsePanels } = usePlayerWorker()
  const [playerIndex, setPlayerIndex] = useState(0)
  // Preview pane selector: 'screenplay' shows the existing preview, 'player' will show the media player
  const [previewPane, setPreviewPane] = useState('screenplay')
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const mediaPlayerRef = useRef(null)
  const playbackTimerRef = useRef(null)
  const [playbackEnded, setPlaybackEnded] = useState(false)
  const navSourceRef = useRef(null) // 'user' | 'auto' | null
  const [showNestingTooltip, setShowNestingTooltip] = useState(false)

  // Keep blocks ref in sync
  useEffect(() => {
    blocksRef.current = blocks
  }, [blocks])

  const handleCodeChange = (newCode) => {
    setCode(newCode)
    processText(newCode)
    try { if (typeof parsePanels === 'function') parsePanels(newCode) } catch (e) {}
  }

  // Player navigation helpers
  const gotoPrev = () => {
    if (!Array.isArray(panels) || panels.length === 0) return
    // stop any active playback/timers
    stopPlayback()
    setPlaybackEnded(false)
  navSourceRef.current = 'user'
  setPlayerIndex((idx) => {
      const n = panels.length
      return ((idx - 1) % n + n) % n
    })
  }

  // next; if userInitiated is true (default) stop playback timers. If false, this is programmatic auto-advance.
  const gotoNext = (userInitiated = true) => {
    if (!Array.isArray(panels) || panels.length === 0) return
    navSourceRef.current = userInitiated ? 'user' : 'auto'
    if (userInitiated) {
      stopPlayback()
      setPlaybackEnded(false)
    }
    setPlayerIndex((idx) => {
      const n = panels.length
      return (idx + 1) % n
    })
  }

  // Audio control handlers
  // Start playback sequence
  const handlePlay = async () => {
    // if we finished playback previously, restart from first panel
    if (playbackEnded) {
      setPlayerIndex(0)
      setPlaybackEnded(false)
    }
    // If currently paused on a panel, start audio from the beginning
    try {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.currentTime = 0
      }
    } catch (e) {}
    setIsPlaying(true)
  }

  const handlePause = () => {
  if (!audioRef.current) return
  // mark this as a user-initiated pause so the onPause handler knows
  navSourceRef.current = 'user'
  try { audioRef.current.pause() } catch (e) {}
  setIsPlaying(false)
  }

  const handleStop = () => {
  // Stop playback and reset to first panel
  stopPlayback()
  setPlaybackEnded(false)
  try { setPlayerIndex(0) } catch (e) {}
  }

  // Stop playback helper: clear timers, pause audio, reset time, set isPlaying false
  function stopPlayback() {
    try {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current)
        playbackTimerRef.current = null
      }
    } catch (e) {}
    try {
      if (audioRef.current) {
        // mark as user stop so pause handlers don't mistakenly clear playing state
        navSourceRef.current = 'user'
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    } catch (e) {}
    setIsPlaying(false)
  }

  // Sync audio element events to state and auto-advance on end
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onPlay = () => setIsPlaying(true)
    const onPause = () => {
      // Only treat pause as stopping playback when it was user-initiated.
      if (navSourceRef.current === 'user') setIsPlaying(false)
    }
    const onEnded = () => {
      // Do not set isPlaying to false here; keep playing state so programmatic
      // navigation (auto-advance) continues playback into the next panel.
      // programmatic advance (not user initiated)
      gotoNext(false)
    }
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnded)
    return () => {
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnded)
    }
  }, [playerIndex, panels])

  // Drive playback sequence: when isPlaying is true start timer for current panel
  useEffect(() => {
    // clear any existing timer first
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current)
      playbackTimerRef.current = null
    }

    if (!isPlaying) return

    const p = (panels && panels.length > 0) ? (panels[playerIndex] || panels[0]) : null
    if (!p) {
      setIsPlaying(false)
      return
    }

    // try to play audio for this panel (if audio element present)
    try {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {})
      }
    } catch (e) {}

    const durMs = Math.max(1000, (typeof p.duration === 'number' ? p.duration * 1000 : 3000))
    playbackTimerRef.current = setTimeout(() => {
      // if this is the last panel, end playback and show black screen
      if (!panels || playerIndex >= panels.length - 1) {
        setIsPlaying(false)
        setPlaybackEnded(true)
        playbackTimerRef.current = null
      } else {
        // advance to next panel; the effect will pick up and continue playback
        setPlayerIndex((idx) => idx + 1)
      }
    }, durMs)

    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current)
        playbackTimerRef.current = null
      }
    }
  }, [isPlaying, playerIndex, panels])

  // Pause/reset audio when switching panels
  useEffect(() => {
    // If navigation was user-initiated, pause/reset audio. For programmatic navigation (auto-advance)
    // we want playback to continue.
    if (audioRef.current) {
      try {
        if (navSourceRef.current === 'user') {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
          setIsPlaying(false)
        }
      } catch (e) {}
    }
    // reset nav source marker
    navSourceRef.current = null
    try {
      if (mediaPlayerRef.current && typeof mediaPlayerRef.current.scrollTo === 'function') {
        mediaPlayerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (e) {}
  }, [playerIndex])

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      try { if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current) } catch (e) {}
    }
  }, [])

  // Debug: log which panel the player will render
  useEffect(() => {
    try {
      const panel = (panels && panels.length > 0 && panels[playerIndex]) ? panels[playerIndex] : null
    } catch (e) {}
  }, [panels, playerIndex])

  // hide tooltip when moving between panels
  useEffect(() => {
    setShowNestingTooltip(false)
  }, [playerIndex])

  // localStorage operations
  const saveScript = async () => {
    if (!code.trim()) return
    setIsSaving(true)
    try {
      // Only attempt Drive operations when in GDrive mode
      if (gdriveOn) {
        try {
          const ds = loadDriveState() || {}
          const existingFileId = ds && ds.fileId ? ds.fileId : null
          const folderId = ds && ds.folderId ? ds.folderId : null
          const targetFileName = ds.fileName || `script-${new Date().toISOString().replace(/[:.]/g, '-')}.fountain`

          if (existingFileId) {
            console.log('Saving to existing Drive file', existingFileId)
            const meta = await updateFileContent(existingFileId, code)
            console.log('Saved script to Drive (updated):', meta)
            const next = { ...ds, fileId: meta.id, fileName: meta.name, file: meta }
            try { persistDriveState(next) } catch (e) {}
            setDriveState(next)
            try { window.dispatchEvent(new CustomEvent('fountain:drive:fileSelected', { detail: next })) } catch (e) {}
            setHasSavedScript(true)
            setLastSavedDate(new Date())
            return
          }

          // If no existing file but user has Drive mode on and a folder selected, create a new file
          if (folderId) {
            console.log('Creating new Drive file in folder', folderId)
            const meta = await createFileInFolder(folderId, targetFileName, code)
            console.log('Saved script to Drive (created):', meta)
            const next = { ...ds, fileId: meta.id, fileName: meta.name, file: meta }
            try { persistDriveState(next) } catch (e) {}
            setDriveState(next)
            try { window.dispatchEvent(new CustomEvent('fountain:drive:fileSelected', { detail: next })) } catch (e) {}
            setHasSavedScript(true)
            setLastSavedDate(new Date())
            return
          }
        } catch (e) {
          console.error('GDrive save attempt failed', e)
        }
      }

      // Fallback: save to localStorage
      const scriptData = {
        content: code,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem('fountain-script', JSON.stringify(scriptData))
      setHasSavedScript(true)
      setLastSavedDate(new Date())
    } finally {
      setIsSaving(false)
    }
  }

  // Open the Drive folder picker (used by the persistence toolbar Choose Folder button)
  const chooseFolderApp = async () => {
    try {
      const pick = await openFolderPicker()
      if (!pick) return
      // Picker dispatches 'fountain:drive:folderSelected' which DriveBar listens to
      // so we don't persist here. We simply trigger the picker.
    } catch (err) {
      console.error('Folder pick failed', err)
      alert('Could not open folder picker. Check console for details.')
    }
  }

  // Reload the currently selected Drive file into the editor
  const reloadDriveFile = async () => {
    try {
      const ds = loadDriveState() || {}
      const fileId = ds && ds.fileId ? ds.fileId : null
      if (!fileId) return alert('No Drive file selected to reload')
      setIsReloading(true)
      const content = await getFileContent(fileId)
      setCode(content)
      try { processText(content) } catch (err) { console.error('processText failed', err) }
  // update in-memory markers to reflect the loaded Drive content
  setHasSavedScript(true)
  setLastSavedDate(new Date())
    } catch (err) {
      console.error('Failed to reload Drive file', err)
      alert('Failed to reload Drive file. See console for details.')
    } finally {
      setIsReloading(false)
    }
  }

  // GDrive Save As: prompt for filename, append .fountain, create in selected folder
  const gdriveSaveAs = async () => {
    if (!code.trim()) return alert('Editor is empty')
    try {
      const ds = loadDriveState() || {}
      const folderId = ds && ds.folderId ? ds.folderId : null
      if (!folderId) return alert('No Drive folder selected')

      // suggest a default base filename (without extension)
      const suggested = ds.fileName ? ds.fileName.replace(/\.fountain$/i, '') : `script-${new Date().toISOString().replace(/[:.]/g, '-')}`
      const input = window.prompt('Enter filename (without extension):', suggested)
      if (input === null) return // user cancelled
      const nameTrim = String(input || '').trim()
      if (!nameTrim) return alert('Filename cannot be empty')
      const filename = nameTrim.toLowerCase().endsWith('.fountain') ? nameTrim : `${nameTrim}.fountain`

      // create file in selected folder
      const meta = await createFileInFolder(folderId, filename, code)
      console.log('GDrive Save As created:', meta)

      const next = { ...ds, fileId: meta.id, fileName: meta.name, file: meta }
      try { persistDriveState(next) } catch (e) {}
      setDriveState(next)
      try { window.dispatchEvent(new CustomEvent('fountain:drive:fileSelected', { detail: next })) } catch (e) {}

  // mark as saved (Drive)
  setHasSavedScript(true)
  setLastSavedDate(new Date())
    } catch (err) {
      console.error('GDrive Save As failed', err)
      alert('Failed to save file to Drive. See console for details.')
    }
  }

  // Open modal and list .fountain files in selected folder
  const openGDriveLoad = async () => {
    try {
      const ds = loadDriveState()
      const fid = ds && ds.folderId ? ds.folderId : null
      if (!fid) {
        alert('No Drive folder selected. Use Change Folder first.')
        return
      }
  setIsGDriveLoadOpen(true)
  setGdriveFolderName(ds && ds.folderName ? ds.folderName : null)
      setGdriveLoading(true)
  const files = await listFilesInFolder(fid)
  // Only include files that are plain binary/text blobs (application/octet-stream)
  // which correspond to true .fountain files in our usage.
  const fountainFiles = (files || []).filter((f) => f && (f.mimeType === 'application/octet-stream' || f.mimeType === 'text/plain'))
  // Sort by modifiedTime descending (newest first). Some files may not have modifiedTime; treat them as oldest.
  fountainFiles.sort((a, b) => {
    const ta = a && a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0
    const tb = b && b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0
    return tb - ta
  })
  setGdriveFiles(fountainFiles)
    } catch (err) {
      console.error('openGDriveLoad failed', err)
      alert('Could not list files from Drive. Check console for details.')
    } finally {
      setGdriveLoading(false)
    }
  }

  const loadScript = () => {
    const savedData = localStorage.getItem('fountain-script')
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setCode(parsed.content)
        processText(parsed.content)
        setLastSavedDate(new Date(parsed.savedAt))
      } catch (error) {
        console.error('Error loading saved script:', error)
      }
    }
  }

  const clearSaved = () => {
    localStorage.removeItem('fountain-script')
    setHasSavedScript(false)
    setLastSavedDate(null)
    // Restore default script
    setCode(defaultScriptContent)
    processText(defaultScriptContent)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setCode(text)
      processText(text)
    } catch (error) {
      console.error('Error pasting from clipboard:', error)
    }
  }

  // Clear the editor contents and update preview
  const clearEditor = () => {
    setCode('')
    processText('')
    try {
      if (editorRef.current && editorRef.current.focus) editorRef.current.focus()
    } catch (e) {}
  }

  // Handle cursor position changes from CodeMirror
  const handleCursorChange = useCallback((lineNumber) => {
    const currentBlocks = blocksRef.current
    setCurrentLine(lineNumber)
    
    // Find the corresponding preview block and scroll to it within the preview container
    if (previewRef.current && currentBlocks.length > 0) {
      // Find the block that corresponds to this line or the closest one before it
      let targetBlock = null
      for (let i = currentBlocks.length - 1; i >= 0; i--) {
        if (currentBlocks[i].index <= lineNumber) {
          targetBlock = currentBlocks[i]
          break
        }
      }
      
      if (targetBlock) {
        const blockElement = previewRef.current.querySelector(`[data-line-id="${targetBlock.id}"]`)
        if (blockElement) {
          // Get the preview container dimensions
          const previewContainer = previewRef.current
          const containerRect = previewContainer.getBoundingClientRect()
          const elementRect = blockElement.getBoundingClientRect()
          
          // Calculate the scroll position to center the element in the preview container
          const elementTop = elementRect.top - containerRect.top
          const containerHeight = containerRect.height
          const elementHeight = elementRect.height
          const targetScrollTop = previewContainer.scrollTop + elementTop - (containerHeight / 2) + (elementHeight / 2)
          
          // Smooth scroll within the preview container only
          previewContainer.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          })
        }
      }
    }
  }, []) // Remove blocks dependency since we're using ref

  // Handle clicks on preview blocks to scroll editor
  const handlePreviewClick = useCallback((lineIndex) => {
    if (editorRef.current && editorRef.current.scrollToLine) {
      editorRef.current.scrollToLine(lineIndex)
    }
  }, [])

  // Handle escape key for modals
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (isHelpModalOpen) {
          setIsHelpModalOpen(false)
        } else if (isCharacterModalOpen) {
          setIsCharacterModalOpen(false)
        }
      }
    }
    
    if (isHelpModalOpen || isCharacterModalOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isHelpModalOpen, isCharacterModalOpen])

  // Fullscreen change handling
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (appRef.current && appRef.current.requestFullscreen) {
          await appRef.current.requestFullscreen()
          setIsFullscreen(true)
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
          setIsFullscreen(true)
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
          setIsFullscreen(false)
        }
      }
    } catch (e) {
      // ignore fullscreen errors
      console.error('Fullscreen toggle failed', e)
    }
  }

  return (
  <div className="fountain-app" ref={appRef}>
      {showDesktopSuggestion && (
        <div className="modal-overlay" onClick={() => { localStorage.setItem('desktopSuggestionDismissed','1'); setShowDesktopSuggestion(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tip: enable Desktop site for a better layout</h2>
              <button className="modal-close" onClick={() => { localStorage.setItem('desktopSuggestionDismissed','1'); setShowDesktopSuggestion(false); }}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>For the best editing experience on phones, enable your browser's "Desktop site" option from the browser menu. This prevents the toolbar from wrapping and provides the full desktop layout.</p>
              <p style={{ marginTop: '1rem' }}><strong>How to:</strong> open your browser menu (⋮) and choose "Desktop site" or "Request desktop site".</p>
            </div>
            <div className="modal-header" style={{ borderTop: '1px solid #404040', justifyContent: 'flex-end' }}>
              <button className="toolbar-btn" onClick={() => { localStorage.setItem('desktopSuggestionDismissed','1'); setShowDesktopSuggestion(false); }}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Persistence Toolbar */}
      <div className="persistence-toolbar">
        <div className="toolbar-group">
          {!gdriveOn ? (
            <> 
              <button 
                className={`toolbar-btn ${!code.trim() || isSaving ? 'disabled' : ''}`}
                onClick={saveScript}
                disabled={!code.trim() || isSaving}
                title={'Save current script to browser storage'}
              >
                <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                Save
              </button>
              
              <button 
                className={`toolbar-btn ${!hasSavedScript ? 'disabled' : ''}`}
                onClick={loadScript}
                disabled={!hasSavedScript}
                title={lastSavedDate ? `Load saved script (${lastSavedDate.toLocaleDateString()} ${lastSavedDate.toLocaleTimeString()})` : 'Load saved script'}
              >
                <i className="fas fa-folder-open"></i>
                Load
              </button>
              
              <button 
                className="toolbar-btn"
                onClick={copyToClipboard}
                title="Copy editor contents to clipboard"
              >
                <i className="fas fa-copy"></i>
                Copy
              </button>
              
              <button 
                className="toolbar-btn"
                onClick={pasteFromClipboard}
                title="Paste from clipboard to editor"
              >
                <i className="fas fa-paste"></i>
                Paste
              </button>
            </>
            ) : (
            // GDrive buttons replace the local persistence buttons in-place
            <>
              <button
                className={`toolbar-btn ${(isSaving || isReloading) ? 'disabled' : ''}`}
                onClick={chooseFolderApp}
                disabled={isSaving || isReloading}
                title={(isSaving || isReloading) ? 'Saving...' : (storedHasDriveFolder ? 'Change Drive folder' : 'Select Drive folder')}
              >
                <i className="fas fa-folder-open"></i>
                {storedHasDriveFolder ? ' Change Folder' : ' Select Folder'}
              </button>
              <button className={`toolbar-btn ${(!code.trim() || !hasDriveFolder || isSaving || isReloading) ? 'disabled' : ''}`} onClick={saveScript} disabled={!code.trim() || !hasDriveFolder || isSaving || isReloading} title={'Save to Google Drive'}>
                <i className={`${(isSaving || isReloading) ? 'fas fa-spinner fa-spin' : 'fab fa-google-drive'}`}></i>
                GDrive Save
              </button>
              <button className={`toolbar-btn ${(!code.trim() || !hasDriveFolder || isSaving || isReloading) ? 'disabled' : ''}`} onClick={gdriveSaveAs} disabled={!code.trim() || !hasDriveFolder || isSaving || isReloading} title={(isSaving || isReloading) ? 'Saving...' : 'Save as to Google Drive'}><i className="fas fa-file-export"></i> GDrive Save As</button>
              <button className={`toolbar-btn ${(!hasDriveFolder || isSaving || isReloading) ? 'disabled' : ''}`} onClick={openGDriveLoad} disabled={!hasDriveFolder || isSaving || isReloading} title={(isSaving || isReloading) ? 'Saving...' : 'Load from Google Drive'}><i className="fas fa-download"></i> GDrive Load</button>
              
            </>
          )}
          
          {!gdriveOn && (
            <button
              className={`toolbar-btn danger ${!code.trim() ? 'disabled' : ''}`}
              onClick={clearEditor}
              disabled={!code.trim()}
              title="Clear editor contents"
            >
              <i className="fas fa-trash"></i>
              Clear Editor
            </button>
          )}

          {!gdriveOn ? (
            <button 
              className={`toolbar-btn danger ${!hasSavedScript ? 'disabled' : ''}`}
              onClick={clearSaved}
              disabled={!hasSavedScript}
              title="Clear saved script from storage"
            >
              <i className="fas fa-trash"></i>
              Clear Saved
            </button>
          ) : (
            // In GDrive mode replace the Clear Saved button with the selected
            // folder display and a Clear link (similar to DriveBar).
            <div style={{ fontSize: 12, color: '#f5f5f5' }}>
              {persistedDriveState && persistedDriveState.folderName ? (
                  <div>
                    <div>
                      <i className="fas fa-folder-open persistence-icon" aria-hidden="true"></i>
                      {persistedDriveState.folderName}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        try {
                          clearDriveState()
                          // Persisted state cleared; notify listeners
                          setDriveState({})
                          window.dispatchEvent(new CustomEvent('fountain:drive:cleared'))
                          console.log('App: cleared drive state')
                        } catch (err) {
                          console.error('App: failed to clear drive state', err)
                        }
                      }}
                      style={{ marginLeft: 8, color: '#ddd', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}
                    >
                      <i className="fas fa-trash small-trash" aria-hidden="true"></i>
                    </a>
                    
                  </div>
                  {persistedDriveState && persistedDriveState.fileName ? (
                    <div style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: '#ddd' }}>
                        <i className="fas fa-file persistence-icon" aria-hidden="true"></i>
                        {persistedDriveState.fileName}
                      </span>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          try {
                            const next = { ...loadDriveState(), fileId: undefined, fileName: undefined, file: undefined }
                            persistDriveState(next)
                            setDriveState(next)
                            window.dispatchEvent(new CustomEvent('fountain:drive:fileCleared'))
                          } catch (err) {
                            console.error('App: failed to clear file selection', err)
                          }
                        }}
                        style={{ marginLeft: 8, color: '#ddd', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}
                      >
                        <i className="fas fa-trash small-trash" aria-hidden="true"></i>
                      </a>
                      <i
                        className={`${isReloading ? 'fas fa-spinner fa-spin small-action' : `fas fa-sync-alt small-action ${isSaving ? 'disabled' : ''}`}`}
                        title={isReloading ? 'Reloading...' : 'Reload file from Drive'}
                        onClick={(e) => { e.preventDefault(); if (!isSaving && !isReloading) reloadDriveFile() }}
                        aria-hidden="true"
                      ></i>
                    </div>
                  ) : null}
                </div>
              ) : 'No folder selected'}
            </div>
          )}

          <div className="toolbar-divider"></div>
          
          {/* Character List Button */}
          <button 
            className={`toolbar-btn character-btn ${characters.length === 0 ? 'disabled' : ''}`}
            onClick={() => characters.length > 0 && setIsCharacterModalOpen(true)}
            title={characters.length > 0 ? 'Character List' : 'No characters found'}
            disabled={characters.length === 0}
          >
            <i className="fas fa-user"></i>
            Characters
            {characters.length > 0 && (
              <span className="character-count-badge">{characters.length}</span>
            )}
          </button>

          {/* Help Button (writing help) */}
          <button 
            className="toolbar-btn help-btn"
            onClick={() => setIsHelpModalOpen(true)}
            title="Writing help (Fountain syntax & tips)"
            aria-label="Open writing help"
          >
            <i className="fas fa-pen" aria-hidden="true"></i>
            Help
          </button>
          {/* Demo Button */}
          <button
            className="toolbar-btn demo-btn"
            onClick={() => setIsDemoModalOpen(true)}
            title="Show demo scripts"
            aria-label="Open demo scripts modal"
            style={{ backgroundColor: '#e75480', color: 'white', marginLeft: 0 }}
          >
            <i className="fas fa-download" aria-hidden="true"></i>
            Demo
          </button>
      {/* Demo Scripts Modal */}
      {isDemoModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDemoModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Demo Scripts</h2>
              <button className="modal-close" onClick={() => setIsDemoModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="demo-section">
                <h3>Film</h3>
                <p>A short live-action sample set in a street café. Demonstrates panels, dialogue, and images.</p>
                <button className="toolbar-btn" onClick={() => {
                  fetch("/demo-scripts/film_the_coffee_deal.fountain")
                    .then(r => r.text())
                    .then(txt => { setCode(txt); processText(txt); setIsDemoModalOpen(false); });
                }}>Load Film Demo</button>
              </div>
              <div className="demo-section">
                <h3>Animation</h3>
                <p>A musical animation sample featuring a singing squirrel. Shows lyrics, musical cues, and character interaction.</p>
                <button className="toolbar-btn" onClick={() => {
                  fetch("/demo-scripts/animation_the_singing_squirrel.fountain")
                    .then(r => r.text())
                    .then(txt => { setCode(txt); processText(txt); setIsDemoModalOpen(false); });
                }}>Load Animation Demo</button>
              </div>
              <div className="demo-section">
                <h3>Advertising</h3>
                <p>A playful ad script for Happy Fun Ball. Demonstrates panels, mock disclaimers, and ad-style dialogue.</p>
                <button className="toolbar-btn" onClick={() => {
                  fetch("/demo-scripts/ad_happy_fun_ball.fountain")
                    .then(r => r.text())
                    .then(txt => { setCode(txt); processText(txt); setIsDemoModalOpen(false); });
                }}>Load Advertising Demo</button>
              </div>
              <div className="demo-section">
                <h3>Documentary</h3>
                <p>A documentary sample with voice-over, captions, and subtitles. Shows non-fiction structure and panel usage.</p>
                <button className="toolbar-btn" onClick={() => {
                  fetch("/demo-scripts/documentary_voices_of_the_river.fountain")
                    .then(r => r.text())
                    .then(txt => { setCode(txt); processText(txt); setIsDemoModalOpen(false); });
                }}>Load Documentary Demo</button>
              </div>
            </div>
          </div>
        </div>
      )}
          {/* Move last-saved next to Characters button for better discoverability */}
          {lastSavedDate && (
            <div className="last-saved" style={{ marginLeft: 8 }}>
              Last saved: {lastSavedDate.toLocaleDateString()} at {lastSavedDate.toLocaleTimeString()}
            </div>
          )}
        </div>
        
      </div>

      {/* Mobile View Toggle */}
      <div className="mobile-view-toggle">
        <div className="tabs is-centered">
          <ul>
            <li className={viewMode === 'edit' ? 'is-active' : ''}>
              <a onClick={() => setViewMode('edit')}>
                <span className="icon is-small">
                  <i className="fas fa-edit" aria-hidden="true"></i>
                </span>
                <span>Edit</span>
              </a>
            </li>
            <li className={viewMode === 'preview' ? 'is-active' : ''}>
              <a onClick={() => setViewMode('preview')}>
                <span className="icon is-small">
                  <i className="fas fa-eye" aria-hidden="true"></i>
                </span>
                <span>Preview</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Editor Layout */}
      <div className="editor-layout">
        {/* Fullscreen toggle shown when side-by-side (hidden on small screens via CSS) */}
        <button
          className={`toolbar-btn fullscreen-btn ${isFullscreen ? 'is-active' : ''}`}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} aria-hidden="true"></i>
        </button>
        <div className="columns is-gapless">
          {/* Code Editor - Left Side */}
          <div className={`column is-half-desktop ${viewMode === 'preview' ? 'mobile-hidden' : ''}`}>
            <div className="box editor-box">
              <h3 className="title is-6">Editor</h3>
              <CodeMirrorEditor
                ref={editorRef}
                value={code}
                onChange={handleCodeChange}
                onCursorChange={handleCursorChange}
                placeholder="Type your fountain screenplay here..."
              />
            </div>
          </div>

          {/* Preview - Right Side */}
          <div className={`column is-half-desktop ${viewMode === 'edit' ? 'mobile-hidden' : ''}`}>
            <div className="box preview-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 className="title is-6" style={{ margin: 0 }}>Live Preview:</h3>
                  <div className="pane-toggle" style={{ display: 'flex' }}>
                    <button
                      className={`toolbar-btn pane-toggle-btn ${previewPane === 'screenplay' ? 'is-active' : ''}`}
                      onClick={() => setPreviewPane('screenplay')}
                      aria-pressed={previewPane === 'screenplay'}
                      title="Show screenplay preview"
                    >
                      Screenplay
                    </button>
                    <button
                      className={`toolbar-btn pane-toggle-btn ${previewPane === 'player' ? 'is-active' : ''}`}
                      onClick={() => setPreviewPane('player')}
                      aria-pressed={previewPane === 'player'}
                      title="Show media player"
                    >
                      Player
                    </button>
                  </div>
                </div>
                <div />
              </div>

              {previewPane === 'screenplay' ? (
                <div className="preview-content" ref={previewRef}>
                  {blocks.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                      Loading preview...
                    </div>
                  ) : (
                    blocks.map((block) => (
                      <div 
                        key={block.id} 
                        className={`preview-line ${block.className || ''} ${block.index === currentLine ? 'current-line' : ''}`}
                        data-type={block.type}
                        data-line-id={block.id}
                        data-line-index={block.index}
                        onClick={() => handlePreviewClick(block.index)}
                        style={{ cursor: 'pointer' }}
                      >
                        {block.type === 'image' || block.type === 'audio' || block.type === 'title_page' || block.type === 'page_break' || block.type === 'page_number' ? (
                          <div dangerouslySetInnerHTML={{ __html: block.text }} />
                        ) : (
                          block.text || '\u00A0'
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="media-player" ref={mediaPlayerRef} style={{ padding: '1rem', maxHeight: '80vh', overflowY: 'auto' }}>
                  {/* Panel header: title + duration */}
                  {(() => {
                    const p = (panels && panels.length > 0) ? (panels[playerIndex] || panels[0]) : null
                    const dur = p && typeof p.duration === 'number' ? p.duration : null
                    const total = (panels && panels.length) ? panels.length : 0

                    // Normalize title: strip leading "Panel N:" if present, default to 'untitled'
                    const rawTitle = p && p.title ? String(p.title) : ''
                    let titleText = 'untitled'
                    if (rawTitle && rawTitle.trim()) {
                      titleText = rawTitle.replace(/^\s*Panel\s*\d+\s*[:\-]\s*/i, '').trim()
                      if (!titleText) titleText = 'untitled'
                    }

                    return (
                      <div className="player-header" style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div>
                          {/* Title (prominent) with inline index/total indicator */}
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                              <div className="panel-title-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
                                <div
                                  className="panel-title"
                                  style={{ fontSize: '1.05rem', fontWeight: 700 }}
                                  onMouseEnter={() => setShowNestingTooltip(true)}
                                  onMouseLeave={() => setShowNestingTooltip(false)}
                                  onClick={() => setShowNestingTooltip((v) => !v)}
                                  aria-haspopup="true"
                                  aria-expanded={showNestingTooltip}
                                >
                                  {titleText}
                                </div>
                                {p && p.nesting && (showNestingTooltip) ? (
                                  <div className="panel-nesting-tooltip" role="tooltip">
                                    {p.nesting.act ? <div><strong>Act:</strong> {p.nesting.act}</div> : null}
                                    {p.nesting.scene ? <div><strong>Scene:</strong> {p.nesting.scene}</div> : null}
                                    {p.nesting.sequence ? <div><strong>Sequence:</strong> {p.nesting.sequence}</div> : null}
                                    {!p.nesting.act && !p.nesting.sequence && !p.nesting.scene ? <div style={{ color: '#999' }}>No nesting</div> : null}
                                  </div>
                                ) : null}
                              </div>
                            <div style={{ fontSize: '0.85rem', color: '#bdbdbd' }}>{`(${playerIndex + 1} / ${total})`}</div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12, marginTop: '0.25rem', fontSize: '0.85rem', color: '#999' }}>
                            <div style={{ color: '#999' }}>lines {p && typeof p.startLine === 'number' ? p.startLine : '?'}–{p && typeof p.endLine === 'number' ? p.endLine : '?'}</div>
                          </div>
                          </div>

                          {/* Top-right controls (smaller) with duration floated right */}
                          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.85rem', color: '#999', display: 'flex', alignItems: 'center', gap: 6, marginRight: 6 }}><span style={{ fontSize: '0.95rem' }}>⏱</span>{dur ? `${dur}s` : 'n/a'}</div>
                          <button className="toolbar-btn" title="Stop" aria-label="Stop" onClick={handleStop} style={{ padding: '0.25rem 0.4rem', fontSize: '0.9rem' }}>⏹</button>
                          <button className={`toolbar-btn ${isPlaying ? 'is-active' : ''}`} title="Play" aria-label="Play" onClick={handlePlay} style={{ padding: '0.25rem 0.4rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {isPlaying ? <span className="playing-indicator" aria-hidden="true" /> : null}
                            ▶︎
                          </button>
                          <button className="toolbar-btn" title="Pause" aria-label="Pause" onClick={handlePause} style={{ padding: '0.25rem 0.4rem', fontSize: '0.9rem' }}>⏸</button>
                          <button className="toolbar-btn" title="Previous" aria-label="Previous" onClick={gotoPrev} style={{ padding: '0.25rem 0.4rem', fontSize: '0.9rem' }}>⏮</button>
                          <button className="toolbar-btn" title="Next" aria-label="Next" onClick={gotoNext} style={{ padding: '0.25rem 0.4rem', fontSize: '0.9rem' }}>⏭</button>
                          </div>
                        </div>

                        {/* Progress bar placed under the title/line area and just above the header bottom border */}
                        {isPlaying && (() => {
                          const p = (panels && panels.length > 0) ? (panels[playerIndex] || panels[0]) : null
                          const dur = p && typeof p.duration === 'number' ? p.duration : null
                          const durMs = Math.max(1000, (typeof dur === 'number' ? dur * 1000 : 3000))
                          return (
                            <div className="player-header-progress-wrapper" style={{ position: 'relative' }}>
                              <div
                                key={`player-progress-${playerIndex}-${durMs}`}
                                className={`player-progress`}
                                style={{
                                  animationDuration: `${durMs}ms`
                                }}
                                aria-hidden="true"
                              />
                            </div>
                          )
                        })()}

                      </div>
                    )
                  })()}
                  

                  {/* Image area (or black end slide if playback ended) */}
                  {(() => {
                    if (playbackEnded) {
                      return (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ width: '100%', maxWidth: 640, borderRadius: 6, background: '#000', aspectRatio: '16/9' }} />
                        </div>
                      )
                    }
                    const p = (panels && panels.length > 0) ? (panels[playerIndex] || panels[0]) : null
                    const img = p && p.imageUrl ? p.imageUrl : null
                    return (
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                        {img ? (
                          <img src={img} alt="panel" style={{ width: '100%', maxWidth: 640, borderRadius: 6 }} />
                        ) : (
                          <div style={{ width: '100%', maxWidth: 640, borderRadius: 6, background: '#f0f0f0', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a9a9a' }}>
                            <span>No image</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Audio element */}
                  {(() => {
                    const p = (panels && panels.length > 0) ? (panels[playerIndex] || panels[0]) : null
                    const aud = p && p.audioUrl ? p.audioUrl : null
                    return (
                      <div style={{ marginBottom: '0.75rem' }}>
                        {aud ? (
                          <audio ref={audioRef} controls src={aud} style={{ width: '100%' }} />
                        ) : (
                          <audio ref={audioRef} controls disabled style={{ width: '100%' }} />
                        )}

                        {/* controls are in header */}
                      </div>
                    )
                  })()}

                  {/* Panel script snippet (rendered like the preview) */}
                  <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '0.75rem' }}>
                    {(!panels || panels.length === 0) ? (
                      <div style={{ color: '#999' }}>No panel content found in the script. Add '####' headings to create panels.</div>
                    ) : (
                      (() => {
                        const p = (panels && panels.length > 0) ? (panels[playerIndex] || panels[0]) : null
                        return (
                          <div>
                            <div style={{ padding: '0.5rem' }}>
                              <div className="preview-content player-preview-content" style={{ margin: 0 }}>
                                {p && p.blocks && p.blocks.length > 0 ? (
                                  p.blocks.map((b) => (
                                    <div key={b.id} className={`preview-line ${b.className || ''}`} dangerouslySetInnerHTML={{ __html: b.text || '\u00A0' }} />
                                  ))
                                ) : p && p.snippet ? (
                                  p.snippet.split(/\r?\n/).map((ln, i) => (
                                    <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{ln || '\u00A0'}</div>
                                  ))
                                ) : (
                                  <div style={{ color: '#999' }}>No content for this panel.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })()
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="modal-overlay" onClick={() => setIsHelpModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Fountain.ext Format Reference</h2>
              <button 
                className="modal-close"
                onClick={() => setIsHelpModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="help-section">
                <h3>Title Page</h3>
                <div className="help-example">
                  <code>
                    Title: THE GREAT FOUNTAIN SCRIPT<br/>
                    Credit: Written by<br/>
                    Author: John Dope<br/>
                    Authors: John Dope and Jane Smith<br/>
                    Source: Based on the novel by Famous Writer<br/>
                    Draft Date: October 4, 2025<br/>
                    Date: 10/04/2025<br/>
                    Contact:<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;John Dope<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;555-123-4567<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;john@example.com<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;Literary Agent<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;Agency Name<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;agent@agency.com<br/>
                    Notes: This is a sample script<br/>
                    Copyright: (c) 2025 John Dope
                  </code>
                  <p>
                    Title page elements appear at the top of your script. All are optional.
                    The parser recognizes a wide range of common title-page keys (case-insensitive). Examples include:
                    <ul>
                      <li><strong>title</strong>, <strong>credit</strong></li>
                      <li><strong>author</strong>, <strong>authors</strong>, <strong>writer</strong>, <strong>writers</strong></li>
                      <li><strong>written by</strong>, <strong>screenplay by</strong>, <strong>teleplay by</strong></li>
                      <li><strong>story by</strong>, <strong>adaptation by</strong></li>
                      <li><strong>source</strong>, <strong>based on</strong>, <strong>based on characters by</strong></li>
                      <li><strong>notes</strong>, <strong>draft</strong>, <strong>draft date</strong>, <strong>draft #</strong></li>
                      <li><strong>revision</strong>, <strong>revision date</strong>, <strong>revision color</strong></li>
                      <li><strong>date</strong>, <strong>contact</strong>, <strong>copyright</strong></li>
                      <li><strong>wga</strong>, <strong>wga registration</strong>, <strong>registration</strong>, <strong>registration #</strong></li>
                      <li><strong>series</strong>, <strong>episode</strong>, <strong>episode title</strong>, <strong>showrunner</strong></li>
                      <li><strong>production</strong>, <strong>production company</strong></li>
                    </ul>
                    The parser accepts alternate spacing (for example <code>written by:</code>) and is case-insensitive. Use "Author" for a single writer and "Authors" for multiple. Contact blocks may be multi-line (indent subsequent lines). End the title page with <code>===</code> (page break).
                  </p>
                </div>
              </div>

              <div className="help-section">
                <h3>Scene Headings</h3>
                <div className="help-example">
                  <code>
                    EXT. PARKING LOT - DAY<br/>
                    INT. COFFEE SHOP - NIGHT<br/>
                    .MONTAGE - CODING AND COFFEE
                  </code>
                  <p>Scene headings start with INT./EXT./EST./I\/E or a period (.) for special scenes.</p>
                </div>
              </div>

              <div className="help-section">
                <h3>Characters & Dialogue</h3>
                <div className="help-example">
                  <code>
                    MENTOR<br/>
                    Welcome to the team!<br/><br/>
                    @MENTOR<br/>
                    (power user syntax)<br/><br/>
                    USER #1<br/>
                    Thanks for having me.<br/><br/>
                    BOB O'SHAUNNESSY<br/>
                    (whispering)<br/>
                    This is a parenthetical.
                  </code>
                  <p>
                    Characters are normally written in ALL CAPS (e.g., <code>BOB</code>, <code>DR. SMITH</code>), but the editor also supports a power-user <code>@</code> prefix for mixed-case or unusual names (for example <code>@John Doe</code>).
                    Character matching is Unicode-aware: a character name must start with an uppercase Unicode letter and may contain Unicode letters, numbers, apostrophes (<code>'</code>), hyphens (<code>-</code>), spaces or tabs. The power-user <code>@</code> form (<code>@Name</code>) allows mixed case and additional punctuation where needed.
                    Parentheticals (for example <code>(whispering)</code>) are recognized when placed immediately after a character name and are rendered as parentheticals; the lines that follow are treated as dialogue. For dual dialogue, append <code>^</code> to stacked character names—these must appear consecutively above the dialogue block.
                    Edge cases: the lexer intentionally requires the name to begin with an uppercase Unicode letter to avoid accidental matches inside action text; use the <code>@</code> prefix for names that don't follow the all-caps convention or that start with non-letter characters. This supports non-ASCII names (for example: <strong>ÉLODIE</strong>, <strong>ŁUKASZ</strong>, <strong>张伟</strong>) and matches uppercase letters across many scripts.
                  </p>
                </div>
              </div>

              <div className="help-section">
                <h3>Dual Dialogue</h3>
                <div className="help-example">
                  <code>
                    ALICE^<br/>
                    BOB^<br/>
                    CHARLIE^<br/>
                    I can't believe it!<br/>
                    <br/>
                    CHARLIE ^<br/>
                    DAVE ^<br/>
                    (disgusted)<br/>
                    Eew. no it's nooot!<br/><br/>
                  </code>
                  <p>For dual dialogue, all character names with ^ must be stacked consecutively at the top, then their dialogue follows in order. This creates side-by-side dialogue spoken simultaneously.</p>
                </div>
              </div>

              <div className="help-section">
                <h3>Action Lines</h3>
                <div className="help-example">
                  <code>
                    Bob walks into the room and looks around nervously.<br/><br/>
                    The computer screen flickers to life.
                  </code>
                  <p>Action lines describe what happens on screen.</p>
                </div>
              </div>

              <div className="help-section">
                <h3>Transitions</h3>
                <div className="help-example">
                  <code>
                    FADE IN:<br/>
                    CUT TO:<br/>
                    FADE TO BLACK.<br/>
                    &gt; CUT TO BLACK.
                  </code>
                  <p>
                    Transitions control scene changes. The matcher supports a wider set of transition phrases (for example: <code>FADE IN:</code>, <code>FADE OUT.</code>, <code>CUT TO:</code>, <code>SMASH CUT TO:</code>, <code>MATCH CUT TO:</code>, <code>DISSOLVE TO:</code>, <code>WIPE TO:</code>, <code>BACK TO:</code>, and other common variants). Use <code>&gt;</code> for the power-user transition syntax.
                  </p>
                </div>
              </div>

              <div className="help-section">
                <h3>Centered Text</h3>
                <div className="help-example">
                  <code>
                    &gt;INTERMISSION&lt;<br/>
                    &gt;THE END&lt;
                  </code>
                  <p>Text wrapped in &gt; and &lt; appears centered (great for titles or breaks).</p>
                </div>
              </div>

              <div className="help-section">
                <h3>Act/Scene/Sequence/Panel Hierarchy</h3>
                <div className="help-example">
                  <code>
                    # Act I<br/>
                    ## Scene 1: The Beginning<br/>
                    ### Sequence A: Setup<br/>
                    #### Panel 1<br/>
                    02:30<br/>
                    [i]https://example.com/storyboard1.jpg<br/>
                    [a]https://example.com/dialogue.mp3<br/><br/>
                    #### Panel 2<br/>
                    01:15<br/>
                    [i]https://example.com/storyboard2.jpg
                  </code>
                  <p>Use # for Acts, ## for Scenes, ### for Sequences, #### for Panels. This hierarchy is designed for storyboarding workflows. Durations (mm:ss format) are only used with #### Panels. Images and audio are typically used at the #### Panel level for detailed storyboard frames and audio references.</p>
                </div>
              </div>

              <div className="help-section">
                <h3>Notes & Comments</h3>
                <div className="help-example">
                  <code>
                    [[This is a note for the writer]]<br/><br/>
                    Some action here [[with an inline note]] continues.
                  </code>
                  <p>Notes wrapped in [[ ]] are for writer reference and don't appear in final script.</p>
                </div>
              </div>

              <div className="help-section">
                <h3>Special Elements</h3>
                <div className="help-example">
                  <code>
                    = Synopsis: Brief scene description<br/><br/>
                    ===<br/>
                    (Page Break)<br/><br/>
                    ~Lyrics:<br/>
                    ~"Happy birthday to you"<br/>
                    ~"Happy birthday to you"
                  </code>
                  <p>Use = for synopsis notes, === for page breaks, ~ for lyrics. Each lyric line must begin with ~.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GDrive Load Modal */}
      {isGDriveLoadOpen && (
        <div className="modal-overlay" onClick={() => setIsGDriveLoadOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Open .fountain from Drive</h2>
              <button className="modal-close" onClick={() => setIsGDriveLoadOpen(false)}>×</button>
            </div>
            {gdriveFolderName && (
              <div style={{ padding: '0 16px 8px 16px', color: '#cbd5e1', fontSize: 13 }}>
                <i className="fas fa-folder-open persistence-icon" aria-hidden="true"></i>
                <strong style={{ color: '#e2e8f0' }}>{gdriveFolderName}</strong>
              </div>
            )}
            <div className="modal-body">
              {gdriveLoading ? (
                <div>Loading...</div>
              ) : (
                <div>
                  {gdriveFiles && gdriveFiles.length > 0 ? (
                    <ul>
                      {gdriveFiles.map((f) => (
                        <li key={f.id} style={{ padding: '6px 0' }}>
                          <a
                            href="#"
                            onClick={async (e) => {
                              e.preventDefault()
                              try {
                                // Fetch file content from Drive and load into editor
                                const content = await getFileContent(f.id)
                                setCode(content)
                                try { processText(content) } catch (err) { console.error('processText failed', err) }
                                // Persist selected file metadata in drive state (merge with existing)
                                try {
                                  const current = loadDriveState() || {}
                                  const next = { ...current, fileId: f.id, fileName: f.name, file: f }
                                  try { console.log('App: before persist, localStorage=', localStorage.getItem('fountain:driveState')) } catch (e) {}
                                  persistDriveState(next)
                                  try { console.log('App: after persist, localStorage=', localStorage.getItem('fountain:driveState')) } catch (e) {}
                                  setDriveState(next)
                                  try { window.dispatchEvent(new CustomEvent('fountain:drive:fileSelected', { detail: f })) } catch (e) {}
                                } catch (err) {
                                  console.error('Failed to persist selected file', err)
                                }
                                setIsGDriveLoadOpen(false)
                              } catch (err) {
                                console.error('Failed to load file from Drive', err)
                                alert('Could not load file from Drive. Check console for details.')
                              }
                            }}
                          >
                            <span style={{ display: 'inline-block', minWidth: 240 }}> 
                              {f.name}
                            </span>
                            <span style={{ marginLeft: 8, color: '#9ca3af', fontSize: 12 }}>
                              {f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : 'unknown'}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div>No .fountain files found in this folder.</div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-header" style={{ borderTop: '1px solid #404040', justifyContent: 'flex-end' }}>
              <button className="toolbar-btn" onClick={() => setIsGDriveLoadOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Character List Modal */}
      {isCharacterModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCharacterModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Character List</h2>
              <button 
                className="modal-close"
                onClick={() => setIsCharacterModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {characters.length === 0 ? (
                <p>No characters found in the script.</p>
              ) : (
                <div className="character-list">
                  {characters.map((character) => (
                    <div key={character} className="character-item">
                      <div className="character-name">{character}</div>
                      <div className="character-count">
                        {characterLineCounts.get(character) || 0} dialogue lines
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App