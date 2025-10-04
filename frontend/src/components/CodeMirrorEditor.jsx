import React, { useEffect, useRef } from 'react'
import { EditorView, keymap, highlightActiveLine, lineNumbers, Decoration, ViewPlugin } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap } from '@codemirror/commands'
import { bracketMatching, indentOnInput, foldGutter } from '@codemirror/language'
import { searchKeymap } from '@codemirror/search'
import fountainLanguage from '../modes/fountainMode.js'
import '../index.css'

// ViewPlugin: viewport-aware decorator that enforces .cm-* classes on lines
const lineDecorator = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view
      this.decorations = this.buildDecorations(view)
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view) {
      const widgets = []
      const { from, to } = view.viewport
      const doc = view.state.doc

      let line = doc.lineAt(from)
      while (line.from <= to) {
        const text = line.text.trim()
        if (text) {
          const upper = text.toUpperCase()

          if (/^(?:FADE\s+(?:IN|OUT)|CUT TO BLACK)[:\.]?$/.test(upper) || /.+\sTO:$/.test(upper)) {
            widgets.push(Decoration.line({ class: 'cm-keyword' }).range(line.from))
            widgets.push(Decoration.mark({ class: 'cm-keyword' }).range(line.from, line.to))
          } else if (/^(?:INT|EXT|I\/E)\.|^\./i.test(text)) {
            widgets.push(Decoration.line({ class: 'cm-header' }).range(line.from))
            widgets.push(Decoration.mark({ class: 'cm-header' }).range(line.from, line.to))
          } else if (/^#{1,4}\s/.test(text)) {
            widgets.push(Decoration.line({ class: 'cm-atom' }).range(line.from))
            widgets.push(Decoration.mark({ class: 'cm-atom' }).range(line.from, line.to))
          } else if (/^=\s/.test(text)) {
            widgets.push(Decoration.line({ class: 'cm-synopsis' }).range(line.from))
            widgets.push(Decoration.mark({ class: 'cm-synopsis' }).range(line.from, line.to))
          } else if (/^@?[A-Z0-9 '\-\.]+(?:\^)?$/.test(text) && text === text.toUpperCase()) {
            widgets.push(Decoration.line({ class: 'cm-variable' }).range(line.from))
            widgets.push(Decoration.mark({ class: 'cm-variable' }).range(line.from, line.to))
          }
        }

        if (line.to >= doc.length) break
        line = doc.lineAt(line.to + 1)
      }

      return Decoration.set(widgets)
    }
  },
  { decorations: v => v.decorations }
)

const CodeMirrorEditor = ({ value = '', onChange = () => {}, placeholder = 'Type your fountain screenplay here...' }) => {
  const editorRef = useRef(null)
  const viewRef = useRef(null)

  useEffect(() => {
    if (!editorRef.current) return

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      foldGutter(),
      bracketMatching(),
      indentOnInput(),
      fountainLanguage,
      lineDecorator,
      keymap.of([...defaultKeymap, ...searchKeymap]),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString())
      }),
      EditorView.theme({
        '&': { height: '500px', fontSize: '14px' },
        '.cm-content': { padding: '12px', minHeight: '500px' },
        '.cm-scroller': { fontFamily: "'Fira Code', 'Courier New', monospace" },
      }),
    ]

    const state = EditorState.create({ doc: value, extensions })
    const view = new EditorView({ state, parent: editorRef.current })
    viewRef.current = view

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (value !== current) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }, [value])

  return <div ref={editorRef} className="codemirror-wrapper" data-placeholder={placeholder} />
}

export default CodeMirrorEditor