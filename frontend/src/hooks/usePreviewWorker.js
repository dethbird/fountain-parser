import { useEffect, useRef, useState } from 'react'
import { parseBlocks } from '../utils/fountainParser'

export function usePreviewWorker(initialText = '') {
  const [blocks, setBlocks] = useState([])
  const [characters, setCharacters] = useState([])
  const [characterLineCounts, setCharacterLineCounts] = useState(new Map())
  const workerRef = useRef(null)
  const [useWorker, setUseWorker] = useState(true)

  useEffect(() => {
    if (!useWorker) {
      // Use fallback processing on the main thread
      if (initialText) {
        const processed = parseBlocks(initialText)
        setBlocks(processed.blocks)
        setCharacters(processed.characters)
        setCharacterLineCounts(processed.characterLineCounts)
      }
      return
    }

    // Create a simple module worker that imports the shared parser; fall back to main-thread parsing
    (function () {
      try {
        const worker = new Worker(new URL('../workers/previewWorker.js', import.meta.url), { type: 'module' })

        worker.onerror = (ev) => {
          console.error('Preview module worker error; falling back to main-thread parsing:', ev)
          setUseWorker(false)
        }

        worker.onmessage = (e) => {
          const { type, blocks, characters, characterLineCounts } = e.data
          if (type === 'result') {
            setBlocks(blocks || [])
            setCharacters(characters || [])
            setCharacterLineCounts(characterLineCounts || new Map())
          } else if (type === 'error') {
            console.error('Preview worker reported error:', e.data.message)
          }
        }

        workerRef.current = worker
        if (initialText) worker.postMessage({ type: 'process', text: initialText })

        return () => { try { worker.terminate() } catch (e) {} }
      } catch (err) {
        console.error('Failed to create module worker, falling back to main-thread parsing:', err)
        setUseWorker(false)
      }
    })()
  }, [useWorker])

  // Handle fallback processing when worker is disabled
  useEffect(() => {
    if (!useWorker && initialText) {
      const processed = parseBlocks(initialText)
      setBlocks(processed.blocks)
      setCharacters(processed.characters)
      setCharacterLineCounts(processed.characterLineCounts)
    }
  }, [useWorker, initialText])

  const processText = (text) => {
    if (useWorker && workerRef.current) {
      workerRef.current.postMessage({
        type: 'process',
        text
      })
    } else {
      // Use fallback
      const processed = parseBlocks(text)
      setBlocks(processed.blocks)
      setCharacters(processed.characters)
      setCharacterLineCounts(processed.characterLineCounts)
    }
  }

  return { blocks, characters, characterLineCounts, processText }
}