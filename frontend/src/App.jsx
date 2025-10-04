import React, { useState, useEffect } from 'react'
import './App.css'
import CodeMirrorEditor from './components/CodeMirrorEditor'
import { usePreviewWorker } from './hooks/usePreviewWorker'

function App() {
  const defaultScript = `FADE IN:

EXT. COFFEE SHOP - DAY

JANE sits at a small table, typing on her laptop.

JANE
(looking up from screen)
I think I've got it!

She closes the laptop with satisfaction.

FADE OUT.`

  const [code, setCode] = useState(defaultScript)
  const { blocks, processText } = usePreviewWorker(defaultScript)

  const handleCodeChange = (newCode) => {
    setCode(newCode)
    processText(newCode)
  }

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
              <h3 className="title is-6">Live Preview</h3>
              <div className="preview-content">
                {blocks.map((block) => (
                  <div 
                    key={block.id} 
                    className={`preview-line ${block.className || ''}`}
                    data-type={block.type}
                  >
                    {block.text || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App