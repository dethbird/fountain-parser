import { FOUNTAIN_REGEX as REGEX } from '../constants/fountainRegex.js'

// Helper: make a non-global copy of a regex so we can reliably extract groups
function safeExec(re, text) {
  if (!re) return null
  const flags = (re.flags || '').replace('g', '')
  const r = new RegExp(re.source, flags)
  return r.exec(text)
}

export const durationToMilliseconds = (duration) => {
  if (typeof duration !== 'string') return 0
  const parts = duration.split(':').map(p => p.trim())
  // support formats: ss, mm:ss, hh:mm:ss, hh:mm:ss:ms (last part milliseconds)
  let seconds = 0
  if (parts.length === 1) {
    seconds = parseInt(parts[0], 10) || 0
  } else if (parts.length === 2) {
    seconds = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0)
  } else if (parts.length === 3) {
    seconds = (parseInt(parts[0], 10) || 0) * 3600 + (parseInt(parts[1], 10) || 0) * 60 + (parseInt(parts[2], 10) || 0)
  } else if (parts.length >= 4) {
    // treat last part as milliseconds
    seconds = (parseInt(parts[0], 10) || 0) * 3600 + (parseInt(parts[1], 10) || 0) * 60 + (parseInt(parts[2], 10) || 0)
    const ms = parseInt(parts[3], 10) || 0
    return seconds * 1000 + ms
  }
  return seconds * 1000
}

export const millisecondsToDuration = (milliseconds) => {
  const ms = Math.max(0, parseInt(milliseconds || 0, 10))
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000
  const two = n => String(n).padStart(2, '0')
  const three = n => String(n).padStart(3, '0')
  return [two(hours), two(minutes), two(seconds), three(millis)].join(':')
}

export const lexizeScript = (script) => {
  if (!script) return []
  const LEX = REGEX.LEXER
  const lines = script
    .replace(LEX.STANDARDIZER, '\n')
    .replace(LEX.CLEANER, '')
    .replace(LEX.WHITESPACER, '')
    .split(LEX.SPLITTER)

  return lines.map((line, i) => {
    if (line === undefined || line === null || line === '') return { text: '\n', index: i }
    return { text: line.trim(), index: i }
  })
}

export const tokenizeScript = (script) => {
  const lines = lexizeScript(script)
  const scriptTokens = []
  const titleTokens = []
  const characterCounts = {}
  let duration_in_milliseconds = 0

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    let token = {
      id: `token-${i}`,
      type: undefined,
      lines: [],
      model: undefined
    }

    // Character / Dialogue
    let match = safeExec(REGEX.BLOCK.CHARACTER, line.text)
    if (!match) match = safeExec(REGEX.BLOCK.CHARACTER_POWER_USER, line.text)
    if (match) {
      const nextIndex = i + 1
      if (lines[nextIndex] && lines[nextIndex].text !== '\n') {
        token.lines.push(line)
        token.type = 'dialogue'
        token.model = {
          character: (match[1] || '').trim(),
          parenthetical: match[2] ? match[2].trim() : undefined,
          dual: match[3] ? match[3].trim() : undefined,
          text: []
        }

        let dialogueLine = lines[nextIndex]
        let cur = nextIndex
        while (dialogueLine && dialogueLine.text !== '\n') {
          token.lines.push(dialogueLine)
          token.model.text.push(dialogueLine.text)
          cur++
          dialogueLine = lines[cur]
        }
        i = cur
        scriptTokens.push(token)
        continue
      }
    }

    // Section
    match = safeExec(REGEX.BLOCK.SECTION, line.text)
    if (match) {
      token.lines.push(line)
      token.type = 'section'
      token.model = {
        identifier: match[1],
        level: match[1] ? match[1].length : 0,
        text: [match[2] ? match[2] : ''],
        image: undefined,
        audio: undefined,
        duration: undefined,
        milestones: []
      }

      let nextIndex = i + 1
      while (lines[nextIndex] && lines[nextIndex].text !== '\n') {
        const nextLine = lines[nextIndex]
        token.lines.push(nextLine)
        // only panels/metadata for deepest section (level==4)
        if (token.model.level === 4) {
          if (safeExec(REGEX.BLOCK.IMAGE, nextLine.text)) {
            token.model.image = nextLine.text.trim().replace('[i]', '')
          } else if (safeExec(REGEX.BLOCK.AUDIO, nextLine.text)) {
            token.model.audio = nextLine.text.trim().replace('[a]', '')
          } else if (safeExec(REGEX.BLOCK.DURATION, nextLine.text)) {
            token.model.duration = nextLine.text.trim()
            duration_in_milliseconds += durationToMilliseconds(token.model.duration)
          }
          const mm = safeExec(REGEX.BLOCK.MILESTONE, nextLine.text)
          if (mm) token.model.milestones.push(mm[1])
        }
        nextIndex++
      }
      i = nextIndex
      scriptTokens.push(token)
      continue
    }

    // Scene heading
    match = safeExec(REGEX.BLOCK.SCENE, line.text)
    if (match) {
      token.lines.push(line)
      token.type = 'scene'
      token.model = { text: [match[1] || match[2]] }
      // scene number handling
      const sn = safeExec(REGEX.BLOCK.SCENE_NUMBER, token.model.text[0] || '')
      if (sn) {
        token.model.scene_number = sn[2]
        token.model.text = [token.model.text[0].replace(REGEX.BLOCK.SCENE_NUMBER, '')]
      }
      scriptTokens.push(token)
      i++
      continue
    }

    // Note single-line
    match = safeExec(REGEX.BLOCK.NOTE, line.text)
    if (match) {
      token.lines.push(line)
      token.type = 'note'
      let note = match[0]
      note = note.substring(2, note.length - 2)
      token.model = { text: [note.trim()] }
      scriptTokens.push(token)
      i++
      continue
    }

    // Note multiline
    match = safeExec(REGEX.BLOCK.NOTE_MULTILINE_START, line.text)
    if (match) {
      token.lines.push(line)
      token.type = 'note'
      token.model = { text: [match[0].substring(2).trim()] }
      let nextIndex = i + 1
      while (lines[nextIndex] && lines[nextIndex].text !== '\n') {
        const nextLine = lines[nextIndex]
        token.lines.push(nextLine)
        const m1 = safeExec(REGEX.BLOCK.NOTE_MULTILINE, nextLine.text)
        if (m1) token.model.text.push(m1[0])
        const m2 = safeExec(REGEX.BLOCK.NOTE_MULTILINE_END, nextLine.text)
        if (m2) token.model.text.push(m2[0].substring(0, m2[0].length - 2).trim())
        nextIndex++
      }
      i = nextIndex
      scriptTokens.push(token)
      continue
    }

    // Synopsis
    match = safeExec(REGEX.BLOCK.SYNOPSIS, line.text)
    if (match) {
      token.lines.push(line)
      token.type = 'synopsis'
      token.model = { text: [match[1].trim()] }
      scriptTokens.push(token)
      i++
      continue
    }

    // Blank line
    match = safeExec(REGEX.BLOCK.BLANK_LINE, line.text)
    if (match) {
      token.lines.push(line)
      token.type = 'blank_line'
      token.model = { text: [line.text.trim()] }
      scriptTokens.push(token)
      i++
      continue
    }

    // Page break
    match = safeExec(REGEX.BLOCK.PAGE_BREAK, line.text)
    if (match) {
      token.lines.push(line)
      token.type = 'page_break'
      token.model = { text: [line.text.trim()] }
      scriptTokens.push(token)
      i++
      continue
    }

    // Transition
    match = safeExec(REGEX.BLOCK.TRANSITION, line.text)
    if (match) {
      token.lines.push(line)
      token.type = 'transition'
      token.model = { text: [line.text.trim()] }
      scriptTokens.push(token)
      i++
      continue
    }

    // Power-user transition (leading > )
    match = safeExec(REGEX.BLOCK.TRANSITION_POWER_USER, line.text)
    if (match) {
      token.lines.push(line)
      token.type = 'transition'
      token.model = { text: [line.text.substring(2).trim()] }
      scriptTokens.push(token)
      i++
      continue
    }

    // Lyrics
    match = safeExec(REGEX.BLOCK.LYRICS, line.text)
    if (match) {
      token.lines.push(line)
      token.type = 'lyrics'
      token.model = { text: [match[1].trim()] }
      let nextIndex = i + 1
      while (lines[nextIndex] && safeExec(REGEX.BLOCK.LYRICS, lines[nextIndex].text)) {
        token.lines.push(lines[nextIndex])
        token.model.text.push(safeExec(REGEX.BLOCK.LYRICS, lines[nextIndex].text)[1].trim())
        nextIndex++
      }
      i = nextIndex
      scriptTokens.push(token)
      continue
    }

    // Title page elements
    match = safeExec(REGEX.BLOCK.TITLE, line.text)
    if (match) {
      token.lines.push(line)
      token.type_text = match[0]
      token.type = match[0].toLowerCase().replace(' ', '_')
      token.type = token.type.slice(0, token.type.length - 1)
      const text = line.text.replace(match[0], '').trim()
      token.model = { text: text ? [text] : [] }

      let nextIndex = i + 1
      while (lines[nextIndex] && !safeExec(REGEX.BLOCK.TITLE, lines[nextIndex].text) && lines[nextIndex].text !== '\n') {
        token.lines.push(lines[nextIndex])
        token.model.text.push(lines[nextIndex].text)
        nextIndex++
      }
      i = nextIndex
      titleTokens.push(token)
      continue
    }

    // Action
    match = safeExec(REGEX.BLOCK.ACTION, line.text)
    if (!match) match = safeExec(REGEX.BLOCK.ACTION_POWER_USER, line.text)
    if (match) {
      let text = line.text
      if (text.indexOf('!') === 0) {
        text = text.slice(1).trim()
      }
      token.lines.push(line)
      token.type = 'action'
      token.model = { text: [text] }
      scriptTokens.push(token)
      i++
      continue
    }

    // Default: move on
    i++
  }

  // post-process dual dialogue and character counts
  scriptTokens.reverse()
  const processed = []
  let lastDual = false
  for (let k = 0; k < scriptTokens.length; k++) {
    const token = scriptTokens[k]
    if (token.type === 'dialogue' || token.type === 'blank_line') {
      processed.push(token)
      if (token.type === 'dialogue') {
        const name = (token.model && token.model.character) || 'UNKNOWN'
        characterCounts[name] = (characterCounts[name] || 0) + 1
        const isDual = !!token.model.dual
        if (lastDual) token.model.dual = true
        lastDual = isDual
      }
    } else {
      lastDual = false
      processed.push(token)
    }
  }

  const scriptFinal = processed.reverse()
  // Ensure we also pick up any character lines that weren't part of dialogue tokens
  // (e.g. power-user character markers or isolated character headings)
  for (let li = 0; li < lines.length; li++) {
    const l = lines[li]
    const cm = safeExec(REGEX.BLOCK.CHARACTER, l.text) || safeExec(REGEX.BLOCK.CHARACTER_POWER_USER, l.text)
    if (cm && cm[1]) {
      const nm = cm[1].trim()
      if (nm && !Object.prototype.hasOwnProperty.call(characterCounts, nm)) {
        characterCounts[nm] = 0
      }
    }
  }

  const characters = Object.keys(characterCounts).sort().map(k => ({ name: k, parts: characterCounts[k] }))

  return {
    scriptTokens: scriptFinal,
    titleTokens,
    characters,
    duration_in_milliseconds
  }
}

export default {
  durationToMilliseconds,
  millisecondsToDuration,
  lexizeScript,
  tokenizeScript
}
