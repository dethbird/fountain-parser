import { describe, it, expect, vi } from 'vitest'

// Mock StreamLanguage.define to return the passed config object so we can test token/startState directly
vi.mock('@codemirror/language', () => ({
  StreamLanguage: {
    define: (conf) => conf
  }
}))

import fountainLanguage from './fountainMode.js'

// Minimal fake stream implementation matching the small API used by fountainMode.token
class FakeStream {
  constructor(text) {
    this.text = String(text || '')
    this.pos = 0
  }

  // behave like CodeMirror's stream.match: accept RegExp or string, anchored at current pos
  match(pattern) {
    if (!pattern) return null
    const rest = this.text.slice(this.pos)
    if (typeof pattern === 'string') {
      if (rest.startsWith(pattern)) {
        this.pos += pattern.length
        return true
      }
      return null
    }
    // RegExp - create a non-global copy to ensure exec() returns index
    const flags = pattern.flags ? pattern.flags.replace('g', '') : ''
    const re = new RegExp(pattern.source, flags)
    const m = re.exec(rest)
    if (m && m.index === 0) {
      this.pos += m[0].length
      return m
    }
    return null
  }

  // find the next occurrence of substr and move pos there (but do not consume substr)
  skipTo(substr) {
    const rest = this.text.slice(this.pos)
    const idx = rest.indexOf(substr)
    if (idx === -1) return false
    this.pos += idx
    return true
  }

  skipToEnd() { this.pos = this.text.length }
  next() { if (this.pos >= this.text.length) return undefined; return this.text.charAt(this.pos++) }
  eatSpace() {
    const start = this.pos
    while (this.pos < this.text.length && /\s/.test(this.text.charAt(this.pos))) this.pos++
    return this.pos > start
  }
  peek() { return this.text.charAt(this.pos) || undefined }
  eol() { return this.pos >= this.text.length }
}

describe('fountainMode tokenizer', () => {
  it('startState and blankLine exist', () => {
    const state = fountainLanguage.startState()
    expect(state).toBeTruthy()
    // blankLine should clear character_extended
    state.character_extended = true
    fountainLanguage.blankLine(state)
    expect(state.character_extended).toBe(false)
  })

  it('recognizes FADE IN: as keyword', () => {
    const s = new FakeStream('FADE IN:')
    const state = fountainLanguage.startState()
    const token = fountainLanguage.token(s, state)
    expect(token).toBe('keyword')
  })

  it('recognizes FADE OUT. as keyword', () => {
    const s = new FakeStream('FADE OUT.')
    const state = fountainLanguage.startState()
    const token = fountainLanguage.token(s, state)
    expect(token).toBe('keyword')
  })

  it('recognizes a scene heading as header', () => {
    const s = new FakeStream('INT. HOUSE - DAY')
    const state = fountainLanguage.startState()
    const token = fountainLanguage.token(s, state)
    expect(token).toBe('header')
  })

  it('recognizes uppercase character lines as variable', () => {
    const s = new FakeStream('BOB')
    const state = fountainLanguage.startState()
    const token = fountainLanguage.token(s, state)
    expect(token).toBe('variable')
    // state.character_extended should be true after character
    expect(state.character_extended).toBe(true)
  })

  it('recognizes @-prefixed character as variable', () => {
    const s = new FakeStream('@JANE')
    const state = fountainLanguage.startState()
    const token = fountainLanguage.token(s, state)
    expect(token).toBe('variable')
  })

  it('when in character_extended parentheses returns meta', () => {
    const s = new FakeStream('(whispers)')
    const state = fountainLanguage.startState()
    state.character_extended = true
    const token = fountainLanguage.token(s, state)
    expect(token).toBe('meta')
  })

  it('when in character_extended dialogue returns string', () => {
    const s = new FakeStream('Hello there')
    const state = fountainLanguage.startState()
    state.character_extended = true
    const token = fountainLanguage.token(s, state)
    expect(token).toBe('string')
  })

  it('recognizes inline note [[...]] as comment', () => {
    const s = new FakeStream('[[this is a note]]')
    const state = fountainLanguage.startState()
    const token = fountainLanguage.token(s, state)
    expect(token).toBe('comment')
  })

  it('recognizes title: as def', () => {
    const s = new FakeStream('Title: My Film')
    const state = fountainLanguage.startState()
    const token = fountainLanguage.token(s, state)
    expect(token).toBe('def')
  })

  it('recognizes lyrics starting with ~ as emphasis', () => {
    const s = new FakeStream('~ La la la')
    const state = fountainLanguage.startState()
    const token = fountainLanguage.token(s, state)
    expect(token).toBe('emphasis')
  })

  it('recognizes synopsis starting with = as string', () => {
    const s = new FakeStream('= This is a synopsis')
    const state = fountainLanguage.startState()
    const token = fountainLanguage.token(s, state)
    expect(token).toBe('string')
  })

  it('returns null for a normal action line', () => {
    const s = new FakeStream('A person walks into the room.')
    const state = fountainLanguage.startState()
    const token = fountainLanguage.token(s, state)
    expect(token).toBeNull()
  })
})
