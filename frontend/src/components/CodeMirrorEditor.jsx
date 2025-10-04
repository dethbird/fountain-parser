import React, { useEffect, useRef } from 'react'
import { EditorView, keymap, highlightActiveLine, lineNumbers } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap } from '@codemirror/commands'
import { bracketMatching, indentOnInput, foldGutter } from '@codemirror/language'
import { searchKeymap } from '@codemirror/search'
import { javascript } from '@codemirror/lang-javascript'

const CodeMirrorEditor = ({ value, onChange, placeholder = "Type your fountain screenplay here..." }) => {
  const editorRef = useRef(null)
  const viewRef = useRef(null)

  useEffect(() => {
    if (!editorRef.current) return

    // Create extensions array manually to avoid conflicts
    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      foldGutter(),
      bracketMatching(),
      indentOnInput(),
      javascript(),
      keymap.of([...defaultKeymap, ...searchKeymap]),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString()
          onChange(newValue)
        }
      }),
      EditorView.theme({
        '&': {
          height: '500px',
          fontSize: '14px',
        },
        '.cm-content': {
          padding: '12px',
          minHeight: '500px',
        },
        '.cm-focused': {
          outline: 'none',
        },
        '.cm-editor': {
          borderRadius: '6px',
        },
        '.cm-scroller': {
          fontFamily: '"Fira Code", "Courier New", monospace',
        }
      })
    ]

    const state = EditorState.create({
      doc: value || '',
      extensions: extensions
    })

    // Create the editor view
    const view = new EditorView({
      state,
      parent: editorRef.current
    })

    viewRef.current = view

    // Cleanup function
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [])

  // Update editor content when value prop changes
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value || ''
        }
      })
      viewRef.current.dispatch(transaction)
    }
  }, [value])

  return <div ref={editorRef} className="codemirror-wrapper" />
}

export default CodeMirrorEditor