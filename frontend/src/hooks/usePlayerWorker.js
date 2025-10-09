import { useCallback, useEffect, useRef, useState } from 'react'
import { parsePanels as parsePanelsMain } from '../utils/fountainParser'

let nextRequestId = 1

export function usePlayerWorker() {
  const workerRef = useRef(null)
  const pendingRef = useRef(new Map())
  const [panels, setPanels] = useState([])
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (workerRef.current) {
        try { workerRef.current.terminate() } catch (e) {}
        workerRef.current = null
      }
      // reject any pending promises
      for (const [, { reject }] of pendingRef.current) {
        try { reject(new Error('unmounted')) } catch (e) {}
      }
      pendingRef.current.clear()
    }
  }, [])

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current

    try {
      const worker = new Worker(new URL('../workers/playerWorker.js', import.meta.url), { type: 'module' })

      worker.onmessage = (e) => {
        const { type, panels: p, requestId, message } = e.data || {}
        if (requestId && pendingRef.current.has(requestId)) {
          const { resolve, reject } = pendingRef.current.get(requestId)
          pendingRef.current.delete(requestId)
          if (type === 'panels') {
            try { resolve(p) } catch (err) {}
          } else if (type === 'error') {
            try { reject(new Error(message || 'worker error')) } catch (err) {}
          } else {
            try { reject(new Error('unknown worker response')) } catch (err) {}
          }
        } else {
          // unsolicited panels update - update local state
          if (type === 'panels' && Array.isArray(p)) {
            setPanels(p)
          }
        }
      }

      worker.onerror = (err) => {
        // if worker fails, reject all pending and clear
        for (const [, { reject }] of pendingRef.current) {
          try { reject(err || new Error('worker error')) } catch (e) {}
        }
        pendingRef.current.clear()
        try { worker.terminate() } catch (e) {}
        workerRef.current = null
      }

      workerRef.current = worker
      return worker
    } catch (err) {
      // couldn't create worker (e.g., browser/env limitation)
      workerRef.current = null
      return null
    }
  }, [])

  const parsePanels = useCallback((text) => {
    // Lazy worker creation
    const worker = ensureWorker()
    if (!worker) {
      // fallback to main thread
      try {
        const p = parsePanelsMain(text)
        setPanels(p)
        return Promise.resolve(p)
      } catch (err) {
        return Promise.reject(err)
      }
    }

    const requestId = String(nextRequestId++)
    return new Promise((resolve, reject) => {
      pendingRef.current.set(requestId, { resolve, reject })
      try {
        worker.postMessage({ type: 'parsePanels', text, requestId })
      } catch (err) {
        pendingRef.current.delete(requestId)
        reject(err)
      }
    }).then((p) => {
      if (mountedRef.current) setPanels(p)
      return p
    })
  }, [ensureWorker])

  return { panels, parsePanels }
}
