import React, { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import CodeMirrorEditor from './components/CodeMirrorEditor'
import { usePreviewWorker } from './hooks/usePreviewWorker'
import { usePlayerWorker } from './hooks/usePlayerWorker'
import defaultScriptContent from './assets/defaultScript.fountain?raw'

// Main App component
function App() {
  const [showDesktopSuggestion, setShowDesktopSuggestion] = useState(false)
  const [code, setCode] = useState('')
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState('edit') // 'edit' or 'preview'
  const [currentLine, setCurrentLine] = useState(0)
  const [hasSavedScript, setHasSavedScript] = useState(false)
  const [lastSavedDate, setLastSavedDate] = useState(null)
  const previewRef = useRef(null)
  const editorRef = useRef(null)
  const blocksRef = useRef([])
  const appRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  const { blocks, characters, characterLineCounts, processText } = usePreviewWorker('')
  const { panels, parsePanels } = usePlayerWorker()
  const [playerIndex, setPlayerIndex] = useState(0)
  // Preview pane selector: 'screenplay' shows the existing preview, 'player' will show the media player
  const [previewPane, setPreviewPane] = useState('screenplay')

  // Keep blocks ref in sync
  useEffect(() => {
    blocksRef.current = blocks
  }, [blocks])

  const handleCodeChange = (newCode) => {
    setCode(newCode)
    processText(newCode)
    try { if (typeof parsePanels === 'function') parsePanels(newCode) } catch (e) {}
  }

  // Debug: log which panel the player will render
  useEffect(() => {
    try {
      const panel = (panels && panels.length > 0 && panels[playerIndex]) ? panels[playerIndex] : null
      console.log('Player will render panel:', { index: playerIndex, panel })
    } catch (e) {}
  }, [panels, playerIndex])

  // localStorage operations
  const saveScript = () => {
    if (code.trim()) {
      const scriptData = {
        content: code,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem('fountain-script', JSON.stringify(scriptData))
      setHasSavedScript(true)
      setLastSavedDate(new Date())
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
          <button 
            className={`toolbar-btn ${!code.trim() ? 'disabled' : ''}`}
            onClick={saveScript}
            disabled={!code.trim()}
            title="Save current script to browser storage"
          >
            <i className="fas fa-save"></i>
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
          
          <button
            className={`toolbar-btn danger ${!code.trim() ? 'disabled' : ''}`}
            onClick={clearEditor}
            disabled={!code.trim()}
            title="Clear editor contents"
          >
            <i className="fas fa-trash"></i>
            Clear Editor
          </button>
          
          <button 
            className={`toolbar-btn danger ${!hasSavedScript ? 'disabled' : ''}`}
            onClick={clearSaved}
            disabled={!hasSavedScript}
            title="Clear saved script from storage"
          >
            <i className="fas fa-trash"></i>
            Clear Saved
          </button>
          
          <div className="toolbar-divider"></div>
          
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
        </div>
        
        {lastSavedDate && (
          <div className="last-saved">
            Last saved: {lastSavedDate.toLocaleDateString()} at {lastSavedDate.toLocaleTimeString()}
          </div>
        )}
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
                <h3 className="title is-6" style={{ margin: 0 }}>Live Preview</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`toolbar-btn ${previewPane === 'screenplay' ? 'is-active' : ''}`}
                    onClick={() => setPreviewPane('screenplay')}
                    aria-pressed={previewPane === 'screenplay'}
                    title="Show screenplay preview"
                  >
                    Screenplay
                  </button>
                  <button
                    className={`toolbar-btn ${previewPane === 'player' ? 'is-active' : ''}`}
                    onClick={() => setPreviewPane('player')}
                    aria-pressed={previewPane === 'player'}
                    title="Show media player"
                  >
                    Player
                  </button>
                </div>
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
                <div className="media-player" style={{ padding: '1rem' }}>
                  {/* Panel header: title + duration */}
                  {(() => {
                    const p = (panels && panels.length > 0) ? (panels[playerIndex] || panels[0]) : null
                    const dur = p && typeof p.duration === 'number' ? p.duration : null
                    return (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>{p && p.title ? p.title : `Panel ${playerIndex + 1}`}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.85rem', color: '#999' }}>
                          <div style={{ fontSize: '0.85rem', color: '#999' }}>lines {p && typeof p.startLine === 'number' ? p.startLine : '?'}–{p && typeof p.endLine === 'number' ? p.endLine : '?'}</div>
                          <div style={{ fontSize: '0.85rem', color: '#999' }}>Duration: {dur ? `${dur}s` : 'n/a'}</div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Image area */}
                  {(() => {
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
                          <audio controls src={aud} style={{ width: '100%' }} />
                        ) : (
                          <audio controls disabled style={{ width: '100%' }} />
                        )}

                        {/* Controls row (icons only) - moved below audio */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                          <button className="toolbar-btn" title="Previous" aria-label="Previous">⏮</button>
                          <button className="toolbar-btn" title="Stop" aria-label="Stop">⏹</button>
                          <button className="toolbar-btn" title="Play" aria-label="Play">▶︎</button>
                          <button className="toolbar-btn" title="Pause" aria-label="Pause">⏸</button>
                          <button className="toolbar-btn" title="Next" aria-label="Next">⏭</button>
                        </div>
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
                              <div className="preview-content" style={{ padding: '1rem', margin: 0 }}>
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
                  <p>Title page elements appear at the top of your script. All are optional. Use "Author" for single writer, "Authors" for multiple. Contact can be multi-line with indentation. End title page with === (page break).</p>
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
                  <p>Characters are ALL CAPS. Use @ for power user syntax or mixed-case names like "@John Doe". Names with @ in front will be counted as characters. Parentheticals go under character names.</p>
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
                  <p>Transitions control scene changes. Use &gt; for power user syntax.</p>
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