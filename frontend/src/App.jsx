import React, { useState, useEffect } from 'react'
import './App.css'
import CodeMirrorEditor from './components/CodeMirrorEditor'
import { usePreviewWorker } from './hooks/usePreviewWorker'
import defaultScriptContent from './assets/defaultScript.fountain?raw'

// Main App component
function App() {
  const [code, setCode] = useState('')
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState('edit') // 'edit' or 'preview'
  const [isHeaderCompressed, setIsHeaderCompressed] = useState(false)
  const { blocks, characters, characterLineCounts, processText } = usePreviewWorker('')

  // Load default script on component mount
  useEffect(() => {
    setCode(defaultScriptContent)
    processText(defaultScriptContent)
  }, []) // Remove processText dependency to prevent infinite loop

  const handleCodeChange = (newCode) => {
    setCode(newCode)
    processText(newCode)
  }

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

  // Handle scroll-based header hiding
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop
      setIsHeaderCompressed(scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={`fountain-app ${isHeaderCompressed ? 'header-hidden' : ''}`}>
      {/* Help Button */}
      <button 
        className="help-button"
        onClick={() => setIsHelpModalOpen(true)}
        title="Fountain Format Help"
      >
        ?
      </button>

      {/* Character List Button */}
      <button 
        className={`character-button ${characters.length === 0 ? 'disabled' : ''}`}
        onClick={() => characters.length > 0 && setIsCharacterModalOpen(true)}
        title={characters.length > 0 ? 'Character List' : 'No characters found'}
        disabled={characters.length === 0}
      >
        <i className="fas fa-user"></i>
        {characters.length > 0 && (
          <span className="character-count-badge">{characters.length}</span>
        )}
      </button>

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
        <div className="columns is-gapless">
          {/* Code Editor - Left Side */}
          <div className={`column is-half-desktop ${viewMode === 'preview' ? 'mobile-hidden' : ''}`}>
            <div className="box editor-box">
              <h3 className="title is-6">Fountain Editor</h3>
              <CodeMirrorEditor
                value={code}
                onChange={handleCodeChange}
                placeholder="Type your fountain screenplay here..."
              />
            </div>
          </div>

          {/* Preview - Right Side */}
          <div className={`column is-half-desktop ${viewMode === 'edit' ? 'mobile-hidden' : ''}`}>
            <div className="box preview-box">
              <h3 className="title is-6">Live Preview</h3>
              <div className="preview-content">
                {blocks.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                    Loading preview...
                  </div>
                ) : (
                  blocks.map((block) => (
                    <div 
                      key={block.id} 
                      className={`preview-line ${block.className || ''}`}
                      data-type={block.type}
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
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="modal-overlay" onClick={() => setIsHelpModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Fountain Format Reference</h2>
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