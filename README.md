# fountain-writer

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D18.0-339933?logo=node.js)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![CodeMirror](https://img.shields.io/badge/CodeMirror-6.x-000000)
![PHP](https://img.shields.io/badge/PHP-%3E%3D8.1-777BB4?logo=php)
![Slim](https://img.shields.io/badge/Slim-4.x-2F855A)

An opinionated, fast screenwriting playground for **Fountain** with a minimal **fountain.ext** extension. Live, incremental highlighting in CodeMirror 6 and an async “Word‑like” preview powered by a Web Worker. Ships as a static site you can serve from any LAMP box; the tiny Slim 4 backend is optional.

> **MVP persistence:** this editor stores the current script in `localStorage` only. Use Copy/Paste/Export for backups.

## Features

### Editor with live preview.

Code highlighting for `fountain.ext` screenplay syntax with live print-formatted preview.

![](C:\Users\rishi\code\fountain-parser\assets\img\screenshot-editor.png)

### Character detection with dialog count.

![](C:\Users\rishi\code\fountain-parser\assets\img\screenshot-characters.png)

### Fountain.ext language syntax help.

![](C:\Users\rishi\code\fountain-parser\assets\img\screenshot-fountain-help.png)




---

## Table of Contents

- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Fountain.ext syntax & philosophy](#fountainext-syntax--philosophy)
- [Development](#development)
- [Build & deploy](#build--deploy)
- [Contributing](#contributing)
- [License](#license)

---

## Quick start

```bash
git clone https://github.com/dethbird/fountain-writer.git
cd fountain-writer/frontend
npm i

# dev
npm run dev

# build
npm run build
```
If serving under a subpath (e.g. `/fountain/`), set `base` in `vite.config.ts`.

---

## Architecture

- **Editor (CodeMirror 6)** – incremental lexer keeps highlight fast.
- **Preview (Web Worker)** – main thread sends doc **patches**; worker returns **render diffs**.
- **Scroll‑sync** – both directions via `{from,to}` offsets per preview block.

---

## Fountain.ext syntax & philosophy

**Philosophy:** *Panels* (`####`) are the primary storyboard unit. Images/audio belong at the **panel** level. Acts/Scenes/Sequences organize, but panels drive content breaks.

### Title Page

```
Title: THE GREAT FOUNTAIN SCRIPT
Credit: Written by
Author: John Dope
Authors: John Dope and Jane Smith
Source: Based on the novel by Famous Writer
Draft Date: October 4, 2025
Date: 10/04/2025
Contact:
    John Dope
    555-123-4567
    john@example.com

    Literary Agent
    Agency Name
    agent@agency.com
Notes: This is a sample script
Copyright: (c) 2025 John Dope
```
Title page elements appear at the top of your script. All are optional. Use **Author** for single writer, **Authors** for multiple. `Contact` can be multi‑line with indentation. End title page with `===` (page break).

### Scene Headings
```
EXT. PARKING LOT - DAY
INT. COFFEE SHOP - NIGHT
.MONTAGE - CODING AND COFFEE
```
Scene headings start with `INT.`/`EXT.`/`EST.`/`I/E.` or a leading `.` for special slugs.

### Characters & Dialogue
```
MENTOR
Welcome to the team!

@MENTOR
(power user syntax)

USER #1
Thanks for having me.

BOB O'SHAUNNESSY
(whispering)
This is a parenthetical.
```
Characters are ALL CAPS. Use `@` handles for power-user syntax or mixed-case names. Parentheticals sit under character names.

### Dual Dialogue
```
ALICE^
BOB^
CHARLIE^
I can't believe it!

CHARLIE ^
DAVE ^
(disgusted)
Eew. no it's nooot!
```
Stack character names with `^` then their dialogue lines to render side‑by‑side.

### Action Lines
```
Bob walks into the room and looks around nervously.

The computer screen flickers to life.
```

### Transitions
```
FADE IN:
CUT TO:
FADE TO BLACK.
> CUT TO BLACK.
```
Use `>` for power‑user transitions.

### Centered Text
```
>INTERMISSION<
>THE END<
```

### Act/Scene/Sequence/Panel Hierarchy
```
# Act I
## Scene 1: The Beginning
### Sequence A: Setup
#### Panel 1
02:30
[i]https://example.com/storyboard1.jpg
[a]https://example.com/dialogue.mp3

#### Panel 2
01:15
[i]https://example.com/storyboard2.jpg
```
`#` = **Act**, `##` = **Scene**, `###` = **Sequence**, `####` = **Panel**. Durations (`mm:ss`) only with panels. **Images** (`[i]URL`) and **audio** (`[a]URL`) are intended at **panel** level for storyboard frames and references.

### Notes & Comments
```
[[This is a note for the writer]]

Some action here [[with an inline note]] continues.
```
`[[ … ]]` are writer notes and won't appear in final output.

### Special Elements
```
= Synopsis: Brief scene description

===
(Page Break)

~Lyrics:
~"Happy birthday to you"
~"Happy birthday to you"
```
Use `=` for synopsis lines, `===` for page breaks, `~` to mark each lyric line.

---

## Development

```bash
npm run dev         # vite dev server
npm run build       # production build
# optional backend
composer install && php -S 0.0.0.0:8080 -t public public/index.php
```

---

## Build & deploy

Vite emits static assets. Point your web server to the build output. For SPA routes add a fallback to `index.html`.

Apache example:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^ index.html [QSA,L]
</IfModule>
```

---

## Contributing

Issues and PRs welcome. By contributing you agree your changes are licensed under [Apache-2.0](LICENSE).

1. Open an issue describing the change.
2. Use a topic branch and write concise commits.
3. Add tests where it makes sense (lexer/formatter).

---

## License

Copyright (c) 2025 R. Satsangi / dethbird

Licensed under the **Apache License, Version 2.0**. See [LICENSE](LICENSE).
