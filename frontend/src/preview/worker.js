    // Simple worker that processes text into preview blocks
let currentText = ''

function processText(text) {
  const lines = text.split('\n')
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
    // Character lines - must be ALL CAPS and short
    else if (/^[A-Z][A-Z\s]*$/.test(trimmed) && 
             trimmed.length < 50 && 
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
    
    blocks.push({
      id: `line-${i}`,
      text: line,
      index: i,
      type,
      className,
      speaker
    })
  }
  
  console.log('Final blocks:', blocks.map(b => `${b.index}: "${b.text.trim()}" -> ${b.type}`))
  
  return blocks
}

self.onmessage = function(e) {
  const { type, text } = e.data
  
  if (type === 'process') {
    currentText = text
    const blocks = processText(text)
    
    self.postMessage({
      type: 'result',
      blocks
    })
  }
}