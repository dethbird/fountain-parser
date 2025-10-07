/**
 * Fountain Screenplay Format - Regular Expression Patterns
 * 
 * This file contains all the regex patterns needed to parse and identify
 * different elements of a fountain formatted screenplay.
 * 
 * @see {@link https://fountain.io/syntax} for fountain format specification
 */

// Core lexer patterns for preprocessing
export const LEXER_REGEX = {
  // Comments and structural elements
  BONEYARD: /(^\/\*|^\*\/)$/g,
  
  // Text processing
  SPLITTER: /\n/g,
  CLEANER: /^\n+|\n+$/,
  STANDARDIZER: /\r\n|\r/g,
  WHITESPACER: /^\t+|^ {3,}/gm
}

// Block-level element patterns
export const BLOCK_REGEX = {
  // Basic action line (anything that doesn't match other patterns)
  ACTION: /^(.+)/g,
  ACTION_POWER_USER: /^(?:[!])(.*)/,
  
  // Structural elements
  BLANK_LINE: /(\n)/,
  PAGE_BREAK: /^\={3,}$/,
  
  // Character names and dialogue
  // Allow periods (e.g., MR. MILLER), apostrophes, hyphens and spaces inside names
  // Match a character-name line: NAME [ (parenthetical) ] [ ^ ] and nothing else on the line
  CHARACTER: /^([A-Z][A-Z0-9\.\'\-\s]+)(?:\s*(\([A-Za-z0-9\.\'\-\s]+\))?\s*(\^)?\s*)$/,
  CHARACTER_POWER_USER: /^(?:@)([A-Za-z0-9\.\'\-\s]+)(?:\s*(\([A-Za-z0-9\.\'\-\s]+\))?\s*(\^)?\s*)$/,
  
  // Scene elements
  SCENE: /^((?:\*{0,3}_?)?(?:(?:int|ext|est|i\/e)[. ]).+)|^(?:\.(?!\.+))(.+)/i,
  SCENE_NUMBER: /( *#(.+)# *)/,
  
  // Transitions
  TRANSITION: /^((?:FADE (?:IN|TO BLACK|OUT)|CUT TO BLACK)[\:\.]?|.+ TO\:)/i,
  TRANSITION_POWER_USER: /^(?:> )(.+)/i,
  
  // Metadata and structure
  TITLE: /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/gim,
  SECTION: /^(#{1,4})\ (.*)/,
  SYNOPSIS: /^(?:\=(?!\=+) *)(.*)/,
  
  // Special elements
  MILESTONE: /^(?:\ +)?-\ (.+)/,
  LYRICS: /^(?:~)([\S\s]+)/,
  DURATION: /^([0-9]?[0-9]:[0-9][0-9])/,
  
  // Media elements
  IMAGE: /^(\[i\]https:\/\/(.+))/i,
  AUDIO: /^(\[a\]https:\/\/(.+))/i,
  
  // Notes (multi-line support)
  NOTE: /^(?:\[{2}(?!\[+))(.+)(?:\]{2}(?!\]+))$/g,
  NOTE_MULTILINE_START: /^(?:\[{2})([\S\s]+)$/g,
  NOTE_MULTILINE: /^(?!\[{2})(.+[^\]{2})])$/g,
  NOTE_MULTILINE_END: /^(.+)(?:\]{2})$/g
}

// Inline formatting patterns
export const INLINE_REGEX = {
  // Text formatting
  BOLD: /(?:\*{2})(.+)(?:\*{2})/g,
  ITALIC: /(?:\*{1})(.+)(?:\*{1})/g,
  UNDERLINE: /(?:\_{1})(.+)(?:\_{1})/g,
  
  // Dialogue formatting
  PARENTHETICAL: /(?:\({1})(.+)(?:\){1})/g,
  
  // Layout formatting
  CENTERED: /(?:\>{1})(.+)(?:\<{1})/g,
  TWO_SPACES: /{two spaces}/g,
  
  // Inline notes
  NOTE: /(?:\[{2}(?!\[+))(.+)(?:\]{2}(?!\]+))/g
}

// Section hierarchy mapping
export const SECTION_LEVELS = {
  1: "act",
  2: "sequence", 
  3: "scene",
  4: "panel"
}

// Element type constants for easier reference
export const ELEMENT_TYPES = {
  // Block elements
  ACTION: 'action',
  CHARACTER: 'character',
  DIALOGUE: 'dialogue',
  PARENTHETICAL: 'parenthetical',
  SCENE_HEADING: 'scene_heading',
  TRANSITION: 'transition',
  TITLE_PAGE: 'title_page',
  SECTION: 'section',
  SYNOPSIS: 'synopsis',
  NOTE: 'note',
  BONEYARD: 'boneyard',
  PAGE_BREAK: 'page_break',
  MILESTONE: 'milestone',
  LYRICS: 'lyrics',
  
  // Media elements
  IMAGE: 'image',
  AUDIO: 'audio',
  
  // Inline elements
  BOLD: 'bold',
  ITALIC: 'italic',
  UNDERLINE: 'underline',
  CENTERED: 'centered'
}

// Combined regex object for backward compatibility
export const FOUNTAIN_REGEX = {
  LEXER: LEXER_REGEX,
  BLOCK: BLOCK_REGEX,
  INLINE: INLINE_REGEX,
  SECTION_LEVELS,
  ELEMENT_TYPES
}

// Default export for convenience
export default FOUNTAIN_REGEX