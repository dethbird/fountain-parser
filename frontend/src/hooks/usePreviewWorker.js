import { useEffect, useRef, useState } from 'react'
import { parseBlocks } from '../utils/fountainParser'
// Import the standalone worker as raw text so we can use it as a reliable blob fallback in production
// Vite supports the ?raw suffix to import file contents as a string
import previewWorkerStandaloneText from '../workers/previewWorkerStandalone.js?raw'

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

    // Try to create a worker. In development prefer a module worker (easier debugging).
    // In production prefer the self-contained standalone blob worker (avoids bundler runtime helper issues).
    (async () => {
      try {
        const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV

        // If we have the standalone worker text available (imported via ?raw) and we're in production,
        // prefer creating a blob worker from that to avoid bundler runtime helper issues.
        if (!isDev && typeof previewWorkerStandaloneText === 'string' && previewWorkerStandaloneText.length > 0) {
          const blob = new Blob([previewWorkerStandaloneText], { type: 'application/javascript' })
          const url = URL.createObjectURL(blob)
          const worker = new Worker(url)

          worker.onerror = (ev) => {
            console.error('Standalone blob worker error:', ev)
            setUseWorker(false)
          }

          worker.onmessage = (e) => {
            const { type, blocks, characters, characterLineCounts } = e.data
            if (type === 'result') {
              setBlocks(blocks || [])
              setCharacters(characters || [])
              setCharacterLineCounts(characterLineCounts || new Map())
            } else if (type === 'error') {
              console.error('Preview standalone worker error:', e.data.message)
            }
          }

          workerRef.current = worker

          if (initialText) worker.postMessage({ type: 'process', text: initialText })

          return () => { try { worker.terminate() } catch (e) {} }
        }

        const workerUrl = new URL('../workers/previewWorker.js', import.meta.url)

        // Pre-fetch the worker script to detect 404s / incorrect MIME types in production
        try {
          const resp = await fetch(workerUrl.href, { method: 'GET' })
          if (!resp.ok) {
            throw new Error(`Worker fetch failed: ${resp.status} ${resp.statusText}`)
          }
          // optional: inspect content-type
          const ct = resp.headers.get('content-type') || ''
          if (!/javascript|ecmascript/.test(ct) && !/text\//.test(ct)) {
            console.warn('Worker content-type is', ct)
          }
          // also read the script text so we can create a blob fallback if needed
          var workerScriptText = await resp.text()
        } catch (fetchErr) {
          console.error('Failed to fetch worker script; falling back to main thread parsing:', fetchErr)
          setUseWorker(false)
          return
        }

        let worker
        try {
          worker = new Worker(workerUrl, { type: 'module' })
        } catch (err) {
          // If creating a module worker throws immediately, fall back to main thread
          console.error('Module worker creation failed:', err)
          setUseWorker(false)
          return
        }

        let triedBlobFallback = false

        const createBlobFallback = async (reason) => {
          if (triedBlobFallback) return false
          triedBlobFallback = true
          try {
            console.warn('Creating blob fallback worker due to:', reason)
            // Prefer the build-time imported standalone worker text if available, otherwise fall back to fetched module or inline function
            let fbCode = null
            if (typeof previewWorkerStandaloneText === 'string' && previewWorkerStandaloneText.length > 0) {
              fbCode = previewWorkerStandaloneText
            }
            // If not available, try the fetched module script text
            if (!fbCode && typeof workerScriptText === 'string' && workerScriptText.length > 0) {
              fbCode = workerScriptText
            }
            // Final fallback: inline parseBlocks function (may be mangled by bundler) - last resort
            if (!fbCode) {
              fbCode = `(${parseBlocks.toString()})\nself.onmessage = function(e){ const {type,text} = e.data; if(type==='process'){ try{ const result = (${parseBlocks.name})(text); self.postMessage({type:'result', blocks: result.blocks, characters: result.characters, characterLineCounts: result.characterLineCounts}); } catch(err){ self.postMessage({type:'error', message:String(err)}); } } }`
            }

            const fbBlob = new Blob([fbCode], { type: 'application/javascript' })
            const fbUrl = URL.createObjectURL(fbBlob)
            const fbWorker = new Worker(fbUrl)
            fbWorker.onmessage = worker.onmessage
            fbWorker.onerror = function(ev2) {
              console.error('Fallback blob worker error:', ev2)
              setUseWorker(false)
            }
            try { worker.terminate() } catch (e) {}
            workerRef.current = fbWorker
            if (initialText) fbWorker.postMessage({ type: 'process', text: initialText })
            return true
          } catch (fbErr) {
            console.error('Blob fallback failed:', fbErr)
            setUseWorker(false)
            return false
          }
        }

        worker.onerror = (ev) => {
          // ev is an ErrorEvent with limited info in some browsers; log everything for diagnosis
          try {
            console.error('Worker error, falling back to main thread processing:', ev.message, ev.filename, ev.lineno, ev.colno, ev.error, ev)
          } catch (e) {
            console.error('Worker error event', ev)
          }
          // attempt blob fallback once (async)
          createBlobFallback(ev).then((ok) => {
            if (!ok) setUseWorker(false)
          }).catch(() => setUseWorker(false))
        }

        worker.onmessage = (e) => {
          const { type, blocks, characters, characterLineCounts } = e.data
          if (type === 'result') {
            setBlocks(blocks || [])
            setCharacters(characters || [])
            setCharacterLineCounts(characterLineCounts || new Map())
          } else if (type === 'error') {
            console.error('Preview worker error:', e.data.message)
            // attempt blob fallback if worker reports an internal error
            createBlobFallback(e.data.message || 'worker error message').then((ok) => {
              if (!ok) setUseWorker(false)
            }).catch(() => setUseWorker(false))
            return
          }
        }

        workerRef.current = worker

        // Process initial text
        if (initialText) {
          worker.postMessage({ type: 'process', text: initialText })
        }

        // Cleanup
        return () => {
          try { worker.terminate() } catch (e) {}
        }
      } catch (error) {
        console.error('Failed to create module worker, falling back to main thread:', error)
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