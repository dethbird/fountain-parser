import { describe, test, expect } from 'vitest'
import { parseBlocks, parsePanels } from './fountainParser'

describe('fountainParser', () => {
  test('parseBlocks returns blocks and characters', () => {
    const text = `
TITLE: Test

BOB
Hello there.

ALICE
Hi.
`
    const result = parseBlocks(text)
    expect(result.blocks.some(b => b.type === 'character')).toBe(true)
    expect(result.characters.includes('BOB')).toBe(true)
  })

  test('parsePanels extracts panels with explicit duration and media', () => {
    const text = `# Act
## Scene
### Seq
#### Panel One
02:30
[i]https://example.com/img.jpg
[a]https://example.com/audio.mp3
BOB
Hello

#### Panel Two
BOB
This is dialogue that should be estimated for duration.`

    const panels = parsePanels(text)
    expect(panels.length).toBe(2)
    const p1 = panels[0]
    expect(p1.duration).toBe(150) // 2:30 -> 150s
    expect(p1.imageUrl).toContain('example.com/img.jpg')
    expect(p1.audioUrl).toContain('example.com/audio.mp3')
    const p2 = panels[1]
    expect(p2.durationSource).toBe('estimated')
    expect(p2.duration).toBeGreaterThanOrEqual(2)
  })
})
