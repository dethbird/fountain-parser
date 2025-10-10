// Shared Fountain parser utilities
// Exports:
// - parseBlocks(text): { blocks, characters, characterLineCounts }
// - parsePanels(text): Panel[]

function parseTimeToSeconds(mmss) {
  const parts = mmss.split(':').map((p) => parseInt(p, 10))
  if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    return parts[0] * 60 + parts[1]
  }
  return null
}

function estimateDurationFromText(text) {
  // crude heuristic: words per second
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length
  const wordsPerSecond = 2.5 // ~150 WPM
  const seconds = words / wordsPerSecond
  const minSec = 2
  const maxSec = 120
  return Math.max(minSec, Math.min(maxSec, Math.round(seconds)))
}

export function parseBlocks(text) {
  const lines = (text || '').split('\n')
  const blocks = []

  let currentPage = 1

  let state = {
    character_extended: false,
    note: false
  }

  const characters = new Set()
  const characterLineCounts = new Map()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      state.character_extended = false
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

    if (state.note) {
      if (trimmed.includes(']]')) state.note = false
      type = 'note'
      className = 'note'
    } else if (trimmed.includes('[[')) {
      state.note = !trimmed.includes(']]')
      type = 'note'
      className = 'note'
    } else if (/^(INT\.|EXT\.|EST\.|I\/E\.|\.)/i.test(trimmed)) {
      state.character_extended = false
      type = 'scene'
      className = 'scene-heading'
    } else if (/^(FADE IN:|FADE OUT\.|FADE TO BLACK\.|CUT TO:|CUT TO BLACK\.|DISSOLVE TO:|SMASH CUT TO:)/.test(trimmed) || /TO:$/.test(trimmed)) {
      state.character_extended = false
      type = 'transition'
      className = 'transition'
    } else if (((/^[A-Z][A-Z0-9#\.\'\-\s]*(\^)?$/.test(trimmed) && trimmed.replace('^', '').length < 50 && trimmed.length > 1) || /^@.+$/.test(trimmed))) {
      state.character_extended = true
      if (trimmed.includes('^')) {
        type = 'dual_character'
        className = 'dual-character'
      } else {
        type = 'character'
        className = 'character'
      }
      speaker = trimmed

      const normalizedCharacter = trimmed.replace(/[@^]/g, '').trim().toUpperCase()
      characters.add(normalizedCharacter)
      if (!characterLineCounts.has(normalizedCharacter)) characterLineCounts.set(normalizedCharacter, 0)
    } else if (state.character_extended) {
      if (/^\(.*\)$/.test(trimmed)) {
        type = 'parenthetical'
        className = 'parenthetical'
      } else {
        type = 'dialogue'
        className = 'dialogue'
        // increment count for current speaker if present
        if (speaker) {
          const normalized = speaker.replace(/[@^]/g, '').trim().toUpperCase()
          if (characterLineCounts.has(normalized)) {
            characterLineCounts.set(normalized, characterLineCounts.get(normalized) + 1)
          }
        }
      }
    } else if (/^= /.test(trimmed)) {
      state.character_extended = false
      type = 'synopsis'
      className = 'synopsis'
    } else if (/^~ /.test(trimmed)) {
      state.character_extended = false
      type = 'lyrics'
      className = 'lyrics'
    } else if (/^- /.test(trimmed)) {
      state.character_extended = false
      type = 'milestone'
      className = 'milestone'
    } else if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      state.character_extended = false
      type = 'duration'
      className = 'duration'
    } else if (/^\[i\]https?:\/\/.+/i.test(trimmed)) {
      state.character_extended = false
      type = 'image'
      className = 'image'
    } else if (/^\[a\]https?:\/\/.+/i.test(trimmed)) {
      state.character_extended = false
      type = 'audio'
      className = 'audio'
    } else if (/^(title|credit|author[s]?|source|notes|draft date|date|contact|copyright):/i.test(trimmed)) {
      state.character_extended = false
      const match = trimmed.match(/^(title|credit|author[s]?|source|notes|draft date|date|contact|copyright):/i)
      if (match) {
        const key = match[1].toLowerCase()
        if (key === 'title') {
          type = 'title'
          className = 'title-page-title'
        } else {
          type = 'title_page'
          className = 'title-page-element'
        }
      }
    } else if (/^#{1,4}\s/.test(trimmed)) {
      state.character_extended = false
      const level = trimmed.match(/^(#{1,4})/)[1].length
      type = 'section'
      className = `section-${level}`
    } else if (/^={3,}$/.test(trimmed)) {
      state.character_extended = false
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
    } else if (/^>.+<$/.test(trimmed)) {
      state.character_extended = false
      type = 'centered'
      className = 'centered'
    } else {
      state.character_extended = false
      type = 'action'
      className = 'action'
    }

    let displayText = line
    if (type === 'title') {
      displayText = line.replace(/^title:\s*/i, '')
    } else if (type === 'title_page') {
      const match = line.match(/^([^:]+):\s*(.*)/)
      if (match) displayText = `<strong>${match[1]}:</strong> ${match[2]}`
    } else if (type === 'image') {
      const url = line.replace(/^\[i\]/i, '')
      displayText = `<img src="${url}" alt="Storyboard image" style="max-width: 100%; height: auto; border: 1px solid #ccc; margin: 0.5em 0;" />`
    } else if (type === 'audio') {
      const url = line.replace(/^\[a\]/i, '')
      displayText = `<audio controls style="width: 100%; margin: 0.5em 0;"><source src="${url}" type="audio/mpeg">Your browser does not support the audio element.</audio>`
    } else if (type === 'page_break') {
      displayText = '<hr />'
    } else if (type === 'transition') {
      displayText = line.replace(/^> /, '')
    } else if (type === 'character' || type === 'dual_character') {
      displayText = line.replace(/^@/, '')
    } else if (type === 'scene') {
      displayText = line.replace(/^\./, '')
    } else if (type === 'centered') {
      const text = line.replace(/^>|<$/g, '')
      displayText = `> ${text} <`
    }

    blocks.push({ id: `line-${i}`, text: displayText, index: i, type, className, speaker })
  }

  if (blocks.length > 0 && blocks[blocks.length - 1].type !== 'page_break') {
    blocks.push({ id: `final-page-number`, text: `<div class="page-number">${currentPage}</div>`, index: lines.length, type: 'page_number', className: 'page-number', speaker: null })
  }

  const sortedCharacters = Array.from(characters).sort()
  const sortedLineCounts = new Map(Array.from(characterLineCounts.entries()).sort((a, b) => a[0].localeCompare(b[0])))

  return { blocks, characters: sortedCharacters, characterLineCounts: sortedLineCounts }
}

export function parsePanels(text) {
  const lines = (text || '').split('\n')
  const panels = []

  // pre-scan for section headings (#, ##, ###) so we can determine nesting
  const headings = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = (lines[i] || '').trim()
    const m = trimmed.match(/^(#{1,3})\s+(.*)/)
    if (m) {
      headings.push({ level: m[1].length, title: m[2].trim(), line: i })
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (/^####\s/.test(line)) {
      const title = line.replace(/^####\s?/, '').trim()
      const startLine = i + 1 // content typically after the heading
      let j = i + 1
      // collect until next section of level 1-3 or another panel
      while (j < lines.length && !/^#{1,3}\s/.test(lines[j].trim()) && !/^####\s/.test(lines[j].trim())) {
        j++
      }
      const endLine = j - 1
      const panelText = lines.slice(startLine, j).join('\n')

      // parse the blocks inside this panel for images/audio/duration
      const { blocks } = parseBlocks(panelText)

      let duration = null
      let durationSource = 'none'

      // find explicit duration block
      const durBlock = blocks.find((b) => b.type === 'duration')
      if (durBlock) {
        const sec = parseTimeToSeconds((durBlock.text || '').trim())
        if (sec !== null) {
          duration = sec
          durationSource = 'explicit'
        }
      }

  const imageBlock = blocks.find((b) => b.type === 'image')
  const audioBlock = blocks.find((b) => b.type === 'audio')

  // Remove only the specific blocks we used for duration/image/audio so the
  // player script snippet doesn't render those items below the panel media.
  // Any other [i]/[a]/duration blocks present in the panel will remain.
  const filteredBlocks = blocks.filter((b) => {
  if (!b) return false
  // drop page number blocks entirely from panel snippet
  if (b.type === 'page_number') return false
  // remove the explicit duration block if it was used
  if (durBlock && b.id === durBlock.id) return false
  // remove the image/audio blocks that we nominated for the panel media
  if (imageBlock && b.id === imageBlock.id) return false
  if (audioBlock && b.id === audioBlock.id) return false
  return true
  })

      // If no explicit duration, estimate from textual content
      if (duration === null) {
        const rawText = blocks.map((b) => (b.type === 'dialogue' || b.type === 'action' || b.type === 'parenthetical') ? b.text : '').join(' ')
        duration = estimateDurationFromText(rawText)
        durationSource = 'estimated'
      }

      panels.push({
        id: `panel-${panels.length + 1}`,
        title,
        panelIndex: panels.length,
        startLine,
        endLine,
        duration,
        durationSource,
        imageUrl: imageBlock ? (imageBlock.text || '').replace(/^<img src="?|".*$/g, '').replace(/^\[i\]/i, '') : null,
        audioUrl: audioBlock ? (audioBlock.text || '').replace(/^<audio.*src="?|".*$/g, '').replace(/^\[a\]/i, '') : null,
  blocks: filteredBlocks,
  // compute nesting from nearest preceding headings of levels 1..3
  nesting: (function() {
    function findNearest(level) {
      for (let k = headings.length - 1; k >= 0; k--) {
        if (headings[k].line < startLine && headings[k].level === level) return headings[k].title
      }
      return null
    }
    return { act: findNearest(1), sequence: findNearest(2), scene: findNearest(3) }
  })()
      })

      // move i forward
      i = j - 1
    }
  }

  return panels
}

export default { parseBlocks, parsePanels }
