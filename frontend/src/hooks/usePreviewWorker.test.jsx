import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { usePreviewWorker } from './usePreviewWorker'

// Small helper component exposing hook output to DOM for assertions
function HookConsumer({ initialText }) {
	const { blocks, characters, characterLineCounts, processText } = usePreviewWorker(initialText)

	return (
		<div>
			<div data-testid="blocks">
				{blocks.map(b => (
					<div key={b.id} data-type={b.type} dangerouslySetInnerHTML={{ __html: b.text }} />
				))}
			</div>
			<div data-testid="chars">{characters.join(',')}</div>
			<button onClick={() => processText('Title: New\nBOB\nHello again\n[[note]]\n===')}>process</button>
		</div>
	)
}

describe('usePreviewWorker', () => {
	let origWorker

	beforeEach(() => {
		origWorker = global.Worker
	})

	afterEach(() => {
		// restore environment and cleanup DOM between tests
		global.Worker = origWorker
		cleanup()
	})

	it('falls back to main-thread processing when Worker cannot be created', async () => {
		// Force Worker constructor to throw so hook falls back
		global.Worker = class {
			constructor() { throw new Error('workers not supported in test') }
		}

		const sample = [
			'Title: My Film',
			'INT. HOUSE - DAY',
			'FADE IN:',
			'BOB',
			'Hello there',
			'[[a private note]]',
			'[i]https://example.com/img.png',
			'===',
		].join('\n')

		render(<HookConsumer initialText={sample} />)

		// Wait for fallback processing to populate the DOM
		await waitFor(() => expect(screen.getByText(/My Film/i)).toBeInTheDocument(), { timeout: 2000 })
		expect(screen.getByText(/INT. HOUSE - DAY/i)).toBeInTheDocument()
		// multiple elements may contain the character name (blocks + summary); ensure at least one exists
		expect(screen.getAllByText(/BOB/i).length).toBeGreaterThan(0)
		expect(screen.getByText(/Hello there/i)).toBeInTheDocument()
		expect(screen.getByText(/a private note/i)).toBeInTheDocument()

		const blocksDiv = screen.getByTestId('blocks')
		// Blocks container should have content (we already asserted key text nodes above)
		await waitFor(() => expect(blocksDiv.children.length).toBeGreaterThan(0), { timeout: 2000 })
	})

	it('uses Worker when available and responds to posted messages', async () => {
		// Mock Worker to simulate onmessage responses
		class FakeWorker {
			constructor() {
				this.onmessage = null
				this.onerror = null
			}
			postMessage(msg) {
				// simulate async worker response
				setTimeout(() => {
					if (this.onmessage) {
						// Return a simplified processed result derived from msg.text
						const t = msg.text || ''
						const blocks = t.split('\n').map((line, i) => ({ id: `w-${i}`, text: line || '', index: i, type: 'action', className: 'action', speaker: null }))
						const characters = ['ALICE']
						const characterLineCounts = {}
						this.onmessage({ data: { type: 'result', blocks, characters, characterLineCounts } })
					}
				}, 0)
			}
			terminate() {}
		}

		global.Worker = FakeWorker

		// initialText triggers worker.postMessage on mount
		render(<HookConsumer initialText={'ONE\nTWO\nTHREE'} />)

		// Wait for worker response to populate blocks
		await waitFor(() => expect(screen.getByText(/ONE/)).toBeInTheDocument(), { timeout: 2000 })
		// ensure blocks container has children produced by the worker
		await waitFor(() => expect(screen.getByTestId('blocks').children.length).toBeGreaterThan(0), { timeout: 2000 })

		// Clicking process button should post new text and update DOM
		fireEvent.click(screen.getByRole('button', { name: /process/i }))
		await waitFor(() => expect(screen.getByText(/BOB/)).toBeInTheDocument(), { timeout: 2000 })
	})
})

