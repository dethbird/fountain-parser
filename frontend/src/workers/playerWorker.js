import { parsePanels } from '../utils/fountainParser'

self.addEventListener('message', (event) => {
  const { data } = event
  if (!data || typeof data.type !== 'string') return

  if (data.type === 'parsePanels') {
    const requestId = data.requestId
    try {
      const panels = parsePanels(data.text || '')
      self.postMessage({ type: 'panels', panels, requestId })
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err), requestId })
    }
  }
})
