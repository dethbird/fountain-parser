import React, { useState, useEffect } from 'react'
import './App.css'
import CodeMirrorEditor from './components/CodeMirrorEditor'
import { usePreviewWorker } from './hooks/usePreviewWorker'

function App() {
  const defaultScript = `title: The Great Fountain Script
credit: Written by
author: John Doe
authors: John Doe and Jane Smith
source: Based on the novel by Famous Writer
draft date: October 4, 2025
date: 10/04/2025
contact:
    John Doe
    555-123-4567
    john@example.com
    
    Literary Agent
    Agency Name
    agent@agency.com
notes: This is a sample script
copyright: (c) 2025 John Doe

===

FADE IN:

EXT. COFFEE SHOP - DAY

JANE sits at a small table, typing on her laptop.

JANE
(looking up from screen)
I think I've got it!

She closes the laptop with satisfaction.

FADE OUT.

===

# Act
New Act

## Scene
New Scene

### Sequence
New sequence

#### panel
a panel

#### Panel: Close-up of Jane
00:15
[i]https://dethbird.com/wp-content/uploads/2025/08/dethbird88_woman_in_an_ice_cream_paarlor_with_a_tiger._She_is_l_e09e158f-a9cc-4462-a172-bbaed73b9fe2.png
[a]https://www.soundjay.com/misc/sounds/bell-ringing-05.wav

#### panel 2
another panel

~ some lyrics

[[ i am a note ]]

DAVE^
JANE^
DONNY^
bees!

- a milestone

= a synopsis`

  const [code, setCode] = useState(defaultScript)
  const { blocks, processText } = usePreviewWorker(defaultScript)

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
                      {block.type === 'image' || block.type === 'audio' || block.type === 'title_page' ? (
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