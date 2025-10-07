import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
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
        const raw = line.text.trim()
        if (raw) {
          // Remove a leading '>' (power-user transition marker) and any following space
          const text = raw.replace(/^>\s*/, '')
          const upper = text.toUpperCase()

          // Match transitions (allow ending with TO or TO:)
          if (/^(?:FADE\s+(?:IN|OUT)|CUT TO BLACK)[:\.]?$/.test(upper) || /.+\sTO:?$/.test(upper)) {
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
          // Duration / timecode lines like 00:15 or 1:05
          } else if (/^\d{1,2}:\d{2}$/.test(text)) {
            widgets.push(Decoration.line({ class: 'cm-number' }).range(line.from))
            widgets.push(Decoration.mark({ class: 'cm-number' }).range(line.from, line.to))
          // Character names - ALL CAPS or starting with @
          } else if ((/^[A-Z][A-Z0-9 '\-\.]*(?:\^)?$/.test(text) && text === text.toUpperCase()) ||
                     /^@.+$/.test(text)) {
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

const CodeMirrorEditor = forwardRef(({ value = '', onChange = () => {}, onCursorChange = () => {}, placeholder = 'Type your fountain screenplay here...' }, ref) => {
  const editorRef = useRef(null)
  const viewRef = useRef(null)

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    scrollToLine: (lineNumber) => {
      const view = viewRef.current
      if (view) {
        const line = view.state.doc.line(Math.max(1, Math.min(lineNumber + 1, view.state.doc.lines)))
        view.dispatch({
          selection: { anchor: line.from, head: line.from },
          effects: EditorView.scrollIntoView(line.from, { y: 'center' })
        })
      }
    },
    focus: () => {
      const view = viewRef.current
      if (view) view.focus()
    }
  }), [])

  useEffect(() => {
    if (!editorRef.current) return

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      foldGutter(),
      bracketMatching(),
      indentOnInput(),
      EditorView.lineWrapping,
      fountainLanguage,
      lineDecorator,
      EditorView.domEventHandlers({
        mouseup: (event, view) => {
          // Small delay to ensure cursor position is updated
          setTimeout(() => {
            const pos = view.state.selection.main.head
            const line = view.state.doc.lineAt(pos)
            onCursorChange(line.number - 1)
          }, 10)
        }
      }),
      oneDark,
      keymap.of([...defaultKeymap, ...searchKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString())
        }
        
        // Track cursor position changes from navigation (not text changes)
        if (update.selectionSet && !update.docChanged) {
          const pos = update.state.selection.main.head
          const line = update.state.doc.lineAt(pos)
          onCursorChange(line.number - 1)
        }
      }),
      EditorView.theme({
        '&': { 
          fontSize: '14px',
          minHeight: '400px',  // Start with a reasonable minimum height
          maxHeight: '80vh'    // Don't let it grow too large on screen
        },
        '.cm-content': { 
          padding: '12px',
          minHeight: '400px'   // Match the minimum height
        },
        '.cm-scroller': { 
          fontFamily: "'Fira Code', 'Courier New', monospace",
          height: 'auto !important'  // Allow auto-sizing
        },
        '.cm-editor': {
          height: 'auto !important'  // Allow auto-sizing
        }
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
})

CodeMirrorEditor.displayName = 'CodeMirrorEditor'

export default CodeMirrorEditor