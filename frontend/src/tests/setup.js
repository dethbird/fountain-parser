import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Polyfill URL.createObjectURL/revokeObjectURL for jsdom environment used by Vitest
if (typeof URL !== 'undefined' && typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = function () {
    // return a dummy blob url string; Worker constructor in tests can be mocked
    return 'blob://vitest'
  }
  URL.revokeObjectURL = function () {}
}

// Provide a minimal Worker stub for jsdom so code that creates inline Workers doesn't throw.
// Tests that require a specific Worker behavior can override global.Worker.
if (typeof globalThis.Worker === 'undefined') {
  // Minimal stub: stores onmessage handler and ignores messages
  class TestWorkerStub {
    constructor() {
      this.onmessage = null
      this.onerror = null
    }
    postMessage() {}
    terminate() {}
  }
  globalThis.Worker = TestWorkerStub
}