import { describe, it, expect } from 'vitest'
import { parseBlocks } from './fountainParser'

describe('fountainParser sample script', () => {
  it('counts dialogue lines per character correctly for the provided example', () => {
    const sample = `title: Brian found some dogs.

BRIAN
Holyyyy shit

JOSH
What'd you find some dogs?

BRIAN
I found some fucking dogs.

JOSH
found???

JOSH walks over to where BRIAN is moving some curtains from in front of a giant cage.

JOSH
Are you sure those are dogs?

BRIAN
(leans into the cage and puts his hand out)
look

One of the "dogs" bites his hand off.

JOSH
Why do they have scales?`

    const res = parseBlocks(sample)

    // characters should include both names
    expect(res.characters).toContain('BRIAN')
    expect(res.characters).toContain('JOSH')

    // counts: BRIAN 3, JOSH 4 (as observed)
    const counts = Object.fromEntries(Array.from(res.characterLineCounts.entries()))
    expect(counts['BRIAN']).toBe(3)
    expect(counts['JOSH']).toBe(4)
  })
})
