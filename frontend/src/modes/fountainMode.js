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
      } else if (nextChar == '^') {
        stream.next()
        stream.skipToEnd()
        return 'keyword'
      }

      stream.skipToEnd()
      return 'string'
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
    
    // scene heading
    if (stream.match(BLOCK_REGEX.SCENE)) {
      state.section = true
      stream.skipToEnd()
      return 'header'
    }
    
    // section
    if (match = stream.match(BLOCK_REGEX.SECTION)) {
      state.section = true
      state.section_level = match[1].length
      stream.skipToEnd()
      return 'header'
    }
    
    // character / dialogue
    if (match = stream.match(/^([A-Z][A-Z0-9'\-. ]+([A-Z0-9'\-. ])+)/)) {
      stream.eatSpace()
      nextChar = stream.peek()
      if (nextChar && nextChar !== '(' && nextChar !== '^') {
        stream.skipToEnd()
        return null
      } else if (nextChar == '(' || nextChar == '^') {
        state.character_extended = true
        return 'variableName'
      }
      state.character_extended = true
      stream.skipToEnd()
      return 'variableName'
    }
    
    if (match = stream.match(/^([@][A-Za-z]+)/)) {
      stream.eatSpace()
      nextChar = stream.peek()
      if (nextChar && nextChar !== '(' && nextChar !== '^') {
        stream.skipToEnd()
        return null
      } else if (nextChar == '(' || nextChar == '^') {
        state.character_extended = true
        return 'variableName'
      }
      state.character_extended = true
      stream.skipToEnd()
      return 'variableName'
    }

    // lyrics
    if (stream.match(/^~ /)) {
      stream.skipToEnd()
      return 'emphasis'
    }
    
    // synopsis
    if (stream.match(/^= /)) {
      stream.skipToEnd()
      return 'processingInstruction'
    }
    
    // page-break
    if (stream.match(BLOCK_REGEX.PAGE_BREAK)) {
      stream.skipToEnd()
      return 'operator'
    }
    
    // check for notes
    if (stream.match(/\[\[/g)) {
      match = stream.skipTo(']]')
      if (!match) {
        stream.backUp(2)
      }
      state.note = true
      return null
    }

    stream.skipToEnd()
    return null
  },

  blankLine(state) {
    state.character_extended = false
  }
})

export default fountainLanguage