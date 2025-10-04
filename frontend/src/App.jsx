import React, { useState } from 'react'
import './App.css'

function App() {
  const [code, setCode] = useState('FADE IN:\n\nEXT. COFFEE SHOP - DAY\n\nJANE sits at a small table, typing on her laptop.\n\nJANE\n(looking up from screen)\nI think I\'ve got it!')

  return (
    <div className="fountain-app">
      {/* Editor Layout */}
      <div className="editor-layout">
        <div className="columns is-gapless">
          {/* Code Editor - Left Side */}
          <div className="column is-half-desktop">
            <div className="box editor-box">
              <h3 className="title is-6">Fountain Editor</h3>
              <textarea
                className="textarea editor-textarea"
                placeholder="Type your fountain screenplay here..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows="20"
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