import React, { useState } from 'react'
import './App.css'
import CodeMirrorEditor from './components/CodeMirrorEditor'

function App() {
  const [code, setCode] = useState(`FADE IN:

EXT. COFFEE SHOP - DAY

JANE sits at a small table, typing on her laptop.

JANE
(looking up from screen)
I think I've got it!

She closes the laptop with satisfaction.

FADE OUT.`)

  const handleCodeChange = (newCode) => {
    setCode(newCode)
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
                {code.split('\n').map((line, index) => (
                  <div key={index} className="preview-line">
                    {line || '\u00A0'}
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