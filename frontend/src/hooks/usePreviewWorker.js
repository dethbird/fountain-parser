import { useEffect, useRef, useState } from 'react'

// Fallback function that mimics the worker functionality
function processTextFallback(text) {
  const lines = text.split('\n')
  const blocks = []
  
  let state = {
    character_extended: false,
    note: false
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Blank line resets character_extended state
    if (!trimmed) {
      state.character_extended = false
      blocks.push({
        id: `line-${i}`,
        text: line,
        index: i,
        type: 'blank',
        className: 'blank-line',
        speaker: null
      })
      continue
    }
    
    let type = 'action'
    let className = 'action'
    let speaker = null
    
    // Note handling
    if (state.note) {
      if (trimmed.includes(']]')) {
        state.note = false
      }
      type = 'note'
      className = 'note'
    } else if (trimmed.includes('[[')) {
      state.note = !trimmed.includes(']]') // stays in note state if not closed
      type = 'note'
      className = 'note'
    }
    // Scene headings
    else if (/^(INT\.|EXT\.|EST\.|I\/E\.|\.)/i.test(trimmed)) {
      state.character_extended = false
      type = 'scene'
      className = 'scene-heading'
    }
    // Transitions
    else if (/^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:|SMASH CUT TO:)/.test(trimmed) || 
             /TO:$/.test(trimmed)) {
      state.character_extended = false
      type = 'transition'
      className = 'transition'
    }
    // Character lines - must be ALL CAPS and short (including dual dialogue with ^)
    else if (/^[A-Z][A-Z\s]*(\^)?$/.test(trimmed) && 
             trimmed.replace('^', '').length < 50 && 
             trimmed.length > 1 &&
             !trimmed.includes('.') &&
             !trimmed.includes(',') &&
             !trimmed.includes('!') &&
             !trimmed.includes('?')) {
      state.character_extended = true
      type = 'character'
      className = 'character'
      speaker = trimmed
    }
    // If we're in character_extended state, check for dialogue/parentheticals
    else if (state.character_extended) {
      if (/^\(.*\)$/.test(trimmed)) {
        type = 'parenthetical'
        className = 'parenthetical'
      } else {
        type = 'dialogue'
        className = 'dialogue'
      }
    }
    // Synopsis
    else if (/^= /.test(trimmed)) {
      state.character_extended = false
      type = 'synopsis'
      className = 'synopsis'
    }
    // Lyrics
    else if (/^~ /.test(trimmed)) {
      state.character_extended = false
      type = 'lyrics'
      className = 'lyrics'
    }
    // Milestone
    else if (/^- /.test(trimmed)) {
      state.character_extended = false
      type = 'milestone'
      className = 'milestone'
    }
    // Duration (MM:SS or H:MM:SS format)
    else if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      state.character_extended = false
      type = 'duration'
      className = 'duration'
    }
    // Image [i]url
    else if (/^\[i\]https?:\/\/.+/i.test(trimmed)) {
      state.character_extended = false
      type = 'image'
      className = 'image'
    }
    // Audio [a]url
    else if (/^\[a\]https?:\/\/.+/i.test(trimmed)) {
      state.character_extended = false
      type = 'audio'
      className = 'audio'
    }
    // Title page elements
    else if (/^(title|credit|author[s]?|source|notes|draft date|date|contact|copyright):/i.test(trimmed)) {
      state.character_extended = false
      const match = trimmed.match(/^(title|credit|author[s]?|source|notes|draft date|date|contact|copyright):/i)
      if (match) {
        const key = match[1].toLowerCase()
        if (key === 'title') {
          type = 'title'
          className = 'title-page-title'
        } else {
          type = 'title_page'
          className = 'title-page-element'
        }
      }
    }
    // Section markers (# ## ### ####)
    else if (/^#{1,4}\s/.test(trimmed)) {
      state.character_extended = false
      const level = trimmed.match(/^(#{1,4})/)[1].length
      type = 'section'
      className = `section-${level}`
    }
    // Page break
    else if (/^={3,}$/.test(trimmed)) {
      state.character_extended = false
      type = 'page_break'
      className = 'page-break'
    }
    // Default: action
    else {
      state.character_extended = false
      type = 'action'
      className = 'action'
    }
    
    let displayText = line
    
    // Special processing for different types
    if (type === 'title') {
      displayText = line.replace(/^title:\s*/i, '')
    } else if (type === 'title_page') {
      // Bold the key part for non-title elements
      const match = line.match(/^([^:]+):\s*(.*)/)
      if (match) {
        const key = match[1]
        const value = match[2]
        displayText = `<strong>${key}:</strong> ${value}`
      }
    } else if (type === 'image') {
      // Extract URL and create img tag
      const url = line.replace(/^\[i\]/i, '')
      displayText = `<img src="${url}" alt="Storyboard image" style="max-width: 100%; height: auto; border: 1px solid #ccc; margin: 0.5em 0;" />`
    } else if (type === 'audio') {
      // Extract URL and create audio tag
      const url = line.replace(/^\[a\]/i, '')
      displayText = `<audio controls style="width: 100%; margin: 0.5em 0;"><source src="${url}" type="audio/mpeg">Your browser does not support the audio element.</audio>`
    }
    
    blocks.push({
      id: `line-${i}`,
      text: displayText,
      index: i,
      type,
      className,
      speaker
    })
  }
  
  return blocks
}

export function usePreviewWorker(initialText = '') {
  const [blocks, setBlocks] = useState([])
  const workerRef = useRef(null)
  const [useWorker, setUseWorker] = useState(true)

  useEffect(() => {
    if (!useWorker) {
      // Use fallback processing
      if (initialText) {
        const processedBlocks = processTextFallback(initialText)
        setBlocks(processedBlocks)
      }
      return
    }

    try {
      // Create worker using inline approach for better cross-environment compatibility
      const workerCode = `
// Simple worker that processes text into preview blocks
let currentText = ''

function processText(text) {
  const lines = text.split('\\n')
  const blocks = []
  
  // State machine like fountainMode
  let state = {
    character_extended: false,
    note: false
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Blank line resets character_extended state
    if (!trimmed) {
      state.character_extended = false
      blocks.push({
        id: \`line-\${i}\`,
        text: line,
        index: i,
        type: 'blank',
        className: 'blank-line',
        speaker: null
      })
      continue
    }
    
    let type = 'action'
    let className = 'action'
    let speaker = null
    
    // Note handling
    if (state.note) {
      if (trimmed.includes(']]')) {
        state.note = false
      }
      type = 'note'
      className = 'note'
    } else if (trimmed.includes('[[')) {
      state.note = !trimmed.includes(']]') // stays in note state if not closed
      type = 'note'
      className = 'note'
    }
    // Scene headings
    else if (/^(INT\\.|EXT\\.|EST\\.|I\\/E\\.|\\.)/.test(trimmed)) {
      state.character_extended = false
      type = 'scene'
      className = 'scene-heading'
    }
    // Transitions
    else if (/^(FADE IN:|FADE OUT\\.|CUT TO:|DISSOLVE TO:|SMASH CUT TO:)/.test(trimmed) || 
             /TO:$/.test(trimmed)) {
      state.character_extended = false
      type = 'transition'
      className = 'transition'
    }
    // Character lines - must be ALL CAPS and short (including dual dialogue with ^)
    else if (/^[A-Z][A-Z\\s]*(\\^)?$/.test(trimmed) && 
             trimmed.replace('^', '').length < 50 && 
             trimmed.length > 1 &&
             !trimmed.includes('.') &&
             !trimmed.includes(',') &&
             !trimmed.includes('!') &&
             !trimmed.includes('?')) {
      state.character_extended = true
      type = 'character'
      className = 'character'
      speaker = trimmed
    }
    // If we're in character_extended state, check for dialogue/parentheticals
    else if (state.character_extended) {
      if (/^\\(.*\\)$/.test(trimmed)) {
        type = 'parenthetical'
        className = 'parenthetical'
      } else {
        type = 'dialogue'
        className = 'dialogue'
      }
    }
    // Synopsis
    else if (/^= /.test(trimmed)) {
      state.character_extended = false
      type = 'synopsis'
      className = 'synopsis'
    }
    // Lyrics
    else if (/^~ /.test(trimmed)) {
      state.character_extended = false
      type = 'lyrics'
      className = 'lyrics'
    }
    // Milestone
    else if (/^- /.test(trimmed)) {
      state.character_extended = false
      type = 'milestone'
      className = 'milestone'
    }
    // Duration (MM:SS or H:MM:SS format)
    else if (/^\\d{1,2}:\\d{2}$/.test(trimmed)) {
      state.character_extended = false
      type = 'duration'
      className = 'duration'
    }
    // Image [i]url
    else if (/^\\[i\\]https?:\\/\\/.+/.test(trimmed)) {
      state.character_extended = false
      type = 'image'
      className = 'image'
    }
    // Audio [a]url
    else if (/^\\[a\\]https?:\\/\\/.+/.test(trimmed)) {
      state.character_extended = false
      type = 'audio'
      className = 'audio'
    }
    // Title page elements
    else if (/^(title|credit|author[s]?|source|notes|draft date|date|contact|copyright):/.test(trimmed)) {
      state.character_extended = false
      const match = trimmed.match(/^(title|credit|author[s]?|source|notes|draft date|date|contact|copyright):/)
      if (match) {
        const key = match[1].toLowerCase()
        if (key === 'title') {
          type = 'title'
          className = 'title-page-title'
        } else {
          type = 'title_page'
          className = 'title-page-element'
        }
      }
    }
    // Section markers (# ## ### ####)
    else if (/^#{1,4}\\s/.test(trimmed)) {
      state.character_extended = false
      const level = trimmed.match(/^(#{1,4})/)[1].length
      type = 'section'
      className = \`section-\${level}\`
    }
    // Page break
    else if (/^={3,}$/.test(trimmed)) {
      state.character_extended = false
      type = 'page_break'
      className = 'page-break'
    }
    // Default: action
    else {
      state.character_extended = false
      type = 'action'
      className = 'action'
    }
    
    let displayText = line
    
    // Special processing for different types
    if (type === 'title') {
      displayText = line.replace(/^title:\\s*/, '')
    } else if (type === 'title_page') {
      // Bold the key part for non-title elements
      const match = line.match(/^([^:]+):\\s*(.*)/)
      if (match) {
        const key = match[1]
        const value = match[2]
        displayText = \`<strong>\${key}:</strong> \${value}\`
      }
    } else if (type === 'image') {
      // Extract URL and create img tag
      const url = line.replace(/^\\[i\\]/, '')
      displayText = \`<img src="\${url}" alt="Storyboard image" style="max-width: 100%; height: auto; border: 1px solid #ccc; margin: 0.5em 0;" />\`
    } else if (type === 'audio') {
      // Extract URL and create audio tag
      const url = line.replace(/^\\[a\\]/, '')
      displayText = \`<audio controls style="width: 100%; margin: 0.5em 0;"><source src="\${url}" type="audio/mpeg">Your browser does not support the audio element.</audio>\`
    }
    
    blocks.push({
      id: \`line-\${i}\`,
      text: displayText,
      index: i,
      type,
      className,
      speaker
    })
  }
  
  return blocks
}

self.onmessage = function(e) {
  const { type, text } = e.data
  
  if (type === 'process') {
    const blocks = processText(text)
    
    self.postMessage({
      type: 'result',
      blocks
    })
  }
}
`
      
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(blob)
      const worker = new Worker(workerUrl)
      
      worker.onerror = (error) => {
        console.error('Worker error, falling back to main thread processing:', error)
        setUseWorker(false)
        return
      }
      
      worker.onmessage = (e) => {
        const { type, blocks } = e.data
        if (type === 'result') {
          setBlocks(blocks || [])
        }
      }
      
      workerRef.current = worker
      
      // Process initial text
      if (initialText) {
        worker.postMessage({
          type: 'process',
          text: initialText
        })
      }
      
      return () => {
        worker.terminate()
        URL.revokeObjectURL(workerUrl)
      }
    } catch (error) {
      console.error('Failed to create worker, using fallback:', error)
      setUseWorker(false)
    }
  }, [useWorker])

  // Handle fallback processing when worker is disabled
  useEffect(() => {
    if (!useWorker && initialText) {
      const processedBlocks = processTextFallback(initialText)
      setBlocks(processedBlocks)
    }
  }, [useWorker, initialText])

  const processText = (text) => {
    if (useWorker && workerRef.current) {
      workerRef.current.postMessage({
        type: 'process',
        text
      })
    } else {
      // Use fallback
      const processedBlocks = processTextFallback(text)
      setBlocks(processedBlocks)
    }
  }

  return { blocks, processText }
}