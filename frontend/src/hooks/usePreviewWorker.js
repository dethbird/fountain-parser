import { useEffect, useRef, useState } from 'react'

export function usePreviewWorker(initialText = '') {
  const [blocks, setBlocks] = useState([])
  const workerRef = useRef(null)

  useEffect(() => {
    // Create worker
    const worker = new Worker(
      new URL('../preview/worker.js', import.meta.url),
      { type: 'module' }
    )
    
    worker.onmessage = (e) => {
      const { type, blocks } = e.data
      if (type === 'result') {
        setBlocks(blocks || [])
      }
    }
    
    workerRef.current = worker
    
    // Process initial text
    if (initialText) {
      worker.postMessage({
        type: 'process',
        text: initialText
      })
    }
    
    return () => {
      worker.terminate()
    }
  }, [])

  const processText = (text) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'process',
        text
      })
    }
  }

  return { blocks, processText }
}