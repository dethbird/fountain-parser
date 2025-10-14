import('./src/constants/fountainRegex.js').then(mod => {
  const TITLE = mod.BLOCK.TITLE
  const samples=['writer: Danny','written by: Danny','author: Rishi','screenplay by: Janice','not a title: someone']
  for (const s of samples) {
    const m = s.match(TITLE)
    console.log(s, '=>', !!m, m ? m[1] : null)
  }
}).catch(err => { console.error(err) })
