import { parseBlocks } from '../utils/fountainParser.js'

// Worker module that delegates parsing to shared parser
self.onmessage = function (e) {
  const { type, text } = e.data
  if (type === 'process') {
    try {
      const result = parseBlocks(text)
      self.postMessage({
        type: 'result',
        blocks: result.blocks,
        characters: result.characters,
        characterLineCounts: result.characterLineCounts
      })
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) })
    }
  }
}
