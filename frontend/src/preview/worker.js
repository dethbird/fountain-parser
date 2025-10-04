// Simple worker that processes text into preview blocks
let currentText = ''

function classifyLine(line, index, allLines) {
  const trimmed = line.trim()
  
  // Empty line
  if (!trimmed) {
    return { type: 'blank', className: 'blank-line' }
  }
  
  // Scene headings (INT./EXT. or starts with .)
  if (/^(INT\.|EXT\.|EST\.|I\/E\.|\.)/i.test(trimmed)) {
    return { type: 'scene', className: 'scene-heading' }
  }
  
  // Transitions (FADE IN:, FADE OUT., etc.)
  if (/^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:|SMASH CUT TO:)/.test(trimmed) || 
      /TO:$/.test(trimmed)) {
    return { type: 'transition', className: 'transition' }
  }
  
  // Character names (all caps, optionally with (V.O.) or (O.S.))
  if (/^[A-Z][A-Z\s]*(\(.*\))?$/.test(trimmed) && trimmed.length < 50) {
    // Check if next line exists and is not empty (indicates dialogue follows)
    const nextLine = allLines[index + 1]
    if (nextLine && nextLine.trim()) {
      return { type: 'character', className: 'character', speaker: trimmed }
    }
  }
  
  // Parentheticals (text in parentheses)
  if (/^\(.*\)$/.test(trimmed)) {
    return { type: 'parenthetical', className: 'parenthetical' }
  }
  
  // Check if this is dialogue (follows a character line)
  const prevLine = allLines[index - 1]
  if (prevLine && classifyLine(prevLine, index - 1, allLines).type === 'character') {
    return { type: 'dialogue', className: 'dialogue' }
  }
  
  // Default to action
  return { type: 'action', className: 'action' }
}

function processText(text) {
  const lines = text.split('\n')
  const blocks = lines.map((line, index) => {
    const classification = classifyLine(line, index, lines)
    return {
      id: `line-${index}`,
      text: line,
      index,
      type: classification.type,
      className: classification.className,
      speaker: classification.speaker || null
    }
  })
  
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