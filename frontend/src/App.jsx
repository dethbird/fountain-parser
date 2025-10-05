import React, { useState, useEffect } from 'react'
import './App.css'
import CodeMirrorEditor from './components/CodeMirrorEditor'
import { usePreviewWorker } from './hooks/usePreviewWorker'
import defaultScriptContent from './assets/defaultScript.fountain?raw'

function App() {
  const [code, setCode] = useState('')
  const { blocks, processText } = usePreviewWorker('')

  // Load default script on component mount
  useEffect(() => {
    setCode(defaultScriptContent)
    processText(defaultScriptContent)
  }, [processText])

  const handleCodeChange = (newCode) => {
    setCode(newCode)
    processText(newCode)
  }

  // Debug: log blocks to console
  useEffect(() => {
    console.log('App: blocks updated', blocks.length, blocks)
  }, [blocks])

  return (
    <div className="fountain-app">
      {/* Editor Layout */}
      <div className="editor-layout">
        <div className="columns is-gapless">
          {/* Code Editor - Left Side */}
          <div className="column is-half-desktop">
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
          <div className="column is-half-desktop">
            <div className="box preview-box">
              <h3 className="title is-6">Live Preview {blocks.length > 0 && `(${blocks.length} blocks)`}</h3>
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
                      {block.type === 'image' || block.type === 'audio' || block.type === 'title_page' || block.type === 'page_break' ? (
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
    </div>
  )
}

export default App