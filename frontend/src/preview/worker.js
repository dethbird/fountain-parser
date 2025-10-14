// Simple worker that processes text into preview blocks
import { BLOCK_REGEX } from '../constants/fountainRegex.js'
let currentText = ''

function processText(text) {
  const lines = text.split('\n')
  const blocks = []
  
  // Character collection
  const characters = new Set()
  const characterLineCounts = new Map()
  
  // Page tracking
  let currentPage = 1
  
  // State machine like fountainMode
  let state = {
    character_extended: false,
    note: false
  }
  
  let currentSpeaker = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Blank line resets character_extended state
    if (!trimmed) {
      state.character_extended = false
      currentSpeaker = null
      blocks.push({
        id: `line-${i}`,
        text: line,
        index: i,
        type: 'blank',
        className: 'blank-line',
        speaker: null
      })
      continue
    }
    
  let type = 'action'
  let className = 'action'
  let speaker = null
  // initialize displayText early so title handling can assign to it
  let displayText = line
    
    // Note handling
    if (state.note) {
      if (trimmed.includes(']]')) {
        state.note = false
      }
      type = 'note'
      className = 'note'
    } else if (trimmed.includes('[[')) {
      state.note = !trimmed.includes(']]') // stays in note state if not closed
      type = 'note'
      className = 'note'
    }
    // Scene headings
    else if (/^(INT\.|EXT\.|EST\.|I\/E\.|\.)/i.test(trimmed)) {
      state.character_extended = false
      type = 'scene'
      className = 'scene-heading'
    }
    // Transitions
    else if (/^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:|SMASH CUT TO:)/.test(trimmed) || 
             /TO:$/.test(trimmed)) {
      state.character_extended = false
      type = 'transition'
      className = 'transition'
    }
    // Character lines - must be ALL CAPS and short (including dual dialogue with ^) OR start with @
    else if (((/^[A-Z][A-Z0-9#'\s]*(\^)?$/.test(trimmed) && 
             trimmed.replace('^', '').length < 50 && 
             trimmed.length > 1 &&
             !trimmed.includes('.') &&
             !trimmed.includes(',') &&
             !trimmed.includes('!') &&
             !trimmed.includes('?')) ||
             /^@.+$/.test(trimmed))) {
      state.character_extended = true
      type = 'character'
      className = 'character'
      speaker = trimmed
      
      // Normalize character name: remove @ and ^ and convert to uppercase
      const normalizedCharacter = trimmed.replace(/[@^]/g, '').trim().toUpperCase()
      characters.add(normalizedCharacter)
      currentSpeaker = normalizedCharacter
      
      // Initialize line count if not exists
      if (!characterLineCounts.has(normalizedCharacter)) {
        characterLineCounts.set(normalizedCharacter, 0)
      }
    }
    // If we're in character_extended state, check for dialogue/parentheticals
    else if (state.character_extended) {
      if (/^\(.*\)$/.test(trimmed)) {
        type = 'parenthetical'
        className = 'parenthetical'
      } else {
        type = 'dialogue'
        className = 'dialogue'
        
        // Count dialogue lines for current speaker
        if (currentSpeaker && characterLineCounts.has(currentSpeaker)) {
          characterLineCounts.set(currentSpeaker, characterLineCounts.get(currentSpeaker) + 1)
        }
      }
    }
    // Synopsis
    else if (/^= /.test(trimmed)) {
      state.character_extended = false
      type = 'synopsis'
      className = 'synopsis'
    }
    // Lyrics
    else if (/^~ /.test(trimmed)) {
      state.character_extended = false
      type = 'lyrics'
      className = 'lyrics'
    }
    // Milestone
    else if (/^- /.test(trimmed)) {
      state.character_extended = false
      type = 'milestone'
      className = 'milestone'
    }
    // Duration (MM:SS or H:MM:SS format)
    else if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      state.character_extended = false
      type = 'duration'
      className = 'duration'
    }
    // Image [i]url
    else if (/^\[i\]https?:\/\/.+/i.test(trimmed)) {
      state.character_extended = false
      type = 'image'
      className = 'image'
    }
    // Audio [a]url
    else if (/^\[a\]https?:\/\/.+/i.test(trimmed)) {
      state.character_extended = false
      type = 'audio'
      className = 'audio'
    }
    // Title page elements (use centralized BLOCK_REGEX)
    else if (BLOCK_REGEX && BLOCK_REGEX.TITLE && BLOCK_REGEX.TITLE.test(trimmed)) {
      state.character_extended = false
      const match = trimmed.match(BLOCK_REGEX.TITLE)
      if (match && match[1]) {
        const key = match[1].toLowerCase()
        // 'title' still gets the title-page-title class; other keys are title_page
        if (key === 'title') {
          type = 'title'
          className = 'title-page-title'
          displayText = trimmed.replace(match[0], '').trim()
        } else {
          type = 'title_page'
          className = 'title-page-element'
          displayText = `<div><strong>${match[1]}:</strong> ${trimmed.slice(match[0].length).trim()}</div>`
        }
      }
    }
    // Section markers (# ## ### ####)
    else if (/^#{1,4}\s/.test(trimmed)) {
      state.character_extended = false
      const level = trimmed.match(/^(#{1,4})/)[1].length
      type = 'section'
      className = `section-${level}`
    }
    // Page break
    else if (/^={3,}$/.test(trimmed)) {
      state.character_extended = false
      currentSpeaker = null
      
      // Add page number before the page break
      blocks.push({
        id: `page-number-${i}`,
        text: `<div class="page-number">${currentPage}</div>`,
        index: i,
        type: 'page_number',
        className: 'page-number',
        speaker: null
      })
      
      currentPage++
      
      type = 'page_break'
      className = 'page-break'
    }
    // Default: action
    else {
      state.character_extended = false
      type = 'action'
      className = 'action'
    }
    
    
  // Special processing for different types
    if (type === 'title') {
      displayText = line.replace(/^title:\s*/i, '')
    } else if (type === 'image') {
      // Extract URL and create img tag
      const url = line.replace(/^\[i\]/i, '')
      displayText = `<img src="${url}" alt="Storyboard image" style="max-width: 100%; height: auto; border: 1px solid #ccc; margin: 0.5em 0;" />`
    } else if (type === 'audio') {
      // Extract URL and create audio tag
      const url = line.replace(/^\[a\]/i, '')
      displayText = `<audio controls style="width: 100%; margin: 0.5em 0;"><source src="${url}" type="audio/mpeg">Your browser does not support the audio element.</audio>`
    }
    
    blocks.push({
      id: `line-${i}`,
      text: displayText,
      index: i,
      type,
      className,
      speaker
    })
  }
  
  // Add final page number if script doesn't end with a page break
  if (blocks.length > 0 && blocks[blocks.length - 1].type !== 'page_break') {
    blocks.push({
      id: `final-page-number`,
      text: `<div class="page-number">${currentPage}</div>`,
      index: lines.length,
      type: 'page_number',
      className: 'page-number',
      speaker: null
    })
  }
  
  return blocks
}

self.onmessage = function(e) {
  const { type, text } = e.data
  
  if (type === 'process') {
    currentText = text
    const blocks = processText(text)
    
    self.postMessage({
      type: 'result',
      blocks
    })
  }
}