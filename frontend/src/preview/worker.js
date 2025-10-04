// Simple worker that processes text into preview blocks
let currentText = ''

function processText(text) {
  const lines = text.split('\n')
  const blocks = lines.map((line, index) => ({
    id: `line-${index}`,
    text: line,
    index
  }))
  
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