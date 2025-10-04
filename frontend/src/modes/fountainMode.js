import { StreamLanguage } from '@codemirror/language'
import { BLOCK_REGEX } from '../constants/fountainRegex.js'

const fountainLanguage = StreamLanguage.define({
  name: 'fountain',
  
  startState() {
    return {
      last_line_blank: false,
      character_extended: false,
      section: false,
      section_level: false,
      note: false,
    }
  },

  token(stream, state) {
    let match = false
    let nextChar = false

    // note started
    if (state.note) {
      match = stream.skipTo(']]')
      if (match) {
        stream.match(']]')
        state.note = false
        return 'comment'
      } else {
        stream.skipToEnd()
        return 'comment'
      }
    }

    // transitions - check before everything else
    if (stream.match(/^FADE IN:/)) {
      stream.skipToEnd()
      return 'keyword'
    }
    
    if (stream.match(/^FADE OUT\./)) {
      stream.skipToEnd()
      return 'keyword'
    }
    
    if (stream.match(BLOCK_REGEX.TRANSITION)) {
      stream.skipToEnd()
      return 'keyword'
    }
    
    if (stream.match(BLOCK_REGEX.TRANSITION_POWER_USER)) {
      stream.skipToEnd()
      return 'keyword'
    }

    // scene heading - check before character matching
    if (stream.match(BLOCK_REGEX.SCENE)) {
      state.section = true
      stream.skipToEnd()
      return 'header'
    }

    // Check for new character lines BEFORE checking character_extended state
    // character / dialogue
    if (match = stream.match(/^([A-Z][A-Z0-9'\-. ]+([A-Z0-9'\-. ])+)/)) {
      state.character_extended = false // Reset state for new character
      stream.eatSpace()
      nextChar = stream.peek()
      if (nextChar == '^') {
        stream.next() // consume the ^
        state.character_extended = true
        return 'variable' // dual dialogue characters styled same as regular characters
      } else if (nextChar == '(') {
        state.character_extended = true
        return 'variable'
      } else if (nextChar && nextChar !== '(' && nextChar !== '^') {
        stream.skipToEnd()
        return null
      }
      state.character_extended = true
      stream.skipToEnd()
      return 'variable'
    }
    
    if (match = stream.match(/^([@][A-Za-z]+)/)) {
      state.character_extended = false // Reset state for new character
      stream.eatSpace()
      nextChar = stream.peek()
      if (nextChar == '^') {
        stream.next() // consume the ^
        state.character_extended = true
        return 'variable' // dual dialogue characters styled same as regular characters
      } else if (nextChar == '(') {
        state.character_extended = true
        return 'variable'
      } else if (nextChar && nextChar !== '(' && nextChar !== '^') {
        stream.skipToEnd()
        return null
      }
      state.character_extended = true
      stream.skipToEnd()
      return 'variable'
    }

    // Now check character_extended state for dialogue/parentheticals
    if (state.character_extended) {
      nextChar = stream.peek()
      if (nextChar == '(') {
        match = stream.skipTo(')')
        if (match) {
          stream.next()
          stream.eatSpace()
          return 'meta'
        } else {
          stream.skipToEnd()
          return null
        }
      }

  stream.skipToEnd()
  return 'string'  // dialogue uses 'string' token
    }

    // section subelements
    if (state.section) {
      if (stream.match(BLOCK_REGEX.IMAGE)) {
        return 'link'
      } else if (stream.match(BLOCK_REGEX.AUDIO)) {
        return 'link'
      } else if (stream.match(BLOCK_REGEX.MILESTONE)) {
        stream.skipToEnd()
        return 'atom'
      } else if (stream.match(/^[0-9]?[0-9]:[0-9][0-9]/) && state.section_level == 4) {
        stream.skipToEnd()
        return 'number'
      } else if (stream.match(/^,/) && state.section_level == 4) {
        return null
      } else {
        state.section = false
        state.section_level = false
        return null
      }
    }
    
    // title
    if (stream.match(BLOCK_REGEX.TITLE)) {
      stream.skipTo(':')
      stream.next()
      return 'def'
    }
    
    // section
    if (match = stream.match(BLOCK_REGEX.SECTION)) {
      state.section = true
      state.section_level = match[1].length
      stream.skipToEnd()
      return `atom`
    }
    
    // lyrics
    if (stream.match(/^~ /)) {
      stream.skipToEnd()
      return 'emphasis'
    }
    
    // synopsis
    if (stream.match(/^= /)) {
      stream.skipToEnd()
      return 'string'
    }
    
    // page-break
    if (stream.match(BLOCK_REGEX.PAGE_BREAK)) {
      stream.skipToEnd()
      return 'operator'
    }
    
    // check for notes - handle complete note in one token
    if (stream.match(/\[\[/)) {
      // consume everything until ]] or end of line
      while (!stream.eol()) {
        if (stream.match(/\]\]/)) {
          return 'comment' // complete note found
        }
        stream.next()
      }
      // reached end of line without closing ]], continue note on next line
      state.note = true
      return 'comment'
    }

    stream.skipToEnd()
    return null  // Action lines get no special token (default styling)
  },

  blankLine(state) {
    state.character_extended = false
  }
})

export default fountainLanguage