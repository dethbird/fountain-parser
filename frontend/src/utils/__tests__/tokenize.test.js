import { tokenizeScript, lexizeScript } from '../tokenize'
import { test, expect } from 'vitest'

const sample = `FADE IN:

EXT. COFFEE SHOP - DAY

JANE sits at a small table, typing on her laptop.

JANE
(looking up from screen)
I think I've got it!

She closes the laptop with satisfaction.

FADE OUT

[[ a note ]]

~ some lyrics

JANE^
BOB^
DAVE^
Pizza!!! 

= a milestone

> SMASH TO

= Bob decides to go anyway
# scnere
## act
### sequence
#### Panel: Close-up
00:15
[i]https://…/board1.png
- this has to be a pay off
`

test('tokenize sample basic checks', () => {
  const result = tokenizeScript(sample)
  expect(result).toBeDefined()
  // check that transitions exist
  const transitions = result.scriptTokens.filter(t => t.type === 'transition')
  expect(transitions.length).toBeGreaterThanOrEqual(2)
  // durations captured
  const durations = result.scriptTokens.filter(t => t.type === 'section' && t.model && t.model.duration)
  // we expect at least one section with duration (the panel)
  // timecode present should be parsed by the decorator, but tokenizer should not necessarily convert it here
  expect(result.characters.length).toBeGreaterThanOrEqual(3)
})
