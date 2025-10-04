import React, { useState } from 'react'
import natural from 'natural'
import nlp from 'compromise'

const FountainProcessor = () => {
  const [inputText, setInputText] = useState('')
  const [results, setResults] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const processText = async () => {
    if (!inputText.trim()) return

    setIsProcessing(true)
    
    try {
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 500))

      // Natural.js processing
      const tokens = natural.WordTokenizer.prototype.tokenize(inputText)
      const stemmed = tokens.map(token => natural.PorterStemmer.stem(token))
      const sentiment = natural.SentimentAnalyzer.getSentiment(
        tokens.map(token => natural.PorterStemmer.stem(token))
      )

      // Compromise.js processing
      const doc = nlp(inputText)
      const sentences = doc.sentences().out('array')
      const nouns = doc.nouns().out('array')
      const verbs = doc.verbs().out('array')
      const adjectives = doc.adjectives().out('array')

      // Basic fountain screenplay detection
      const fountainElements = {
        characters: doc.match('#Person').out('array'),
        locations: doc.match('(INT.|EXT.) *').out('array'),
        dialogue: sentences.filter(s => s.length > 10 && s.length < 100),
        actions: sentences.filter(s => s.length > 20)
      }

      setResults({
        tokens,
        stemmed,
        sentiment: sentiment || 0,
        sentences,
        nouns,
        verbs,
        adjectives,
        fountainElements,
        stats: {
          wordCount: tokens.length,
          sentenceCount: sentences.length,
          characterCount: inputText.length,
          avgWordsPerSentence: Math.round(tokens.length / sentences.length) || 0
        }
      })
    } catch (error) {
      console.error('Processing error:', error)
      setResults({ error: 'Processing failed. Please try again.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const clearResults = () => {
    setInputText('')
    setResults(null)
  }

  return (
    <div className="text-processor">
      <div className="card">
        <header className="card-header">
          <p className="card-header-title">
            <i className="fas fa-cogs"></i>
            &nbsp;Fountain Text Processor
          </p>
        </header>
        <div className="card-content">
          <div className="field">
            <label className="label">Enter Fountain Screenplay Text:</label>
            <div className="control">
              <textarea
                className="textarea"
                placeholder="FADE IN:

EXT. COFFEE SHOP - DAY

JANE sits at a small table, typing on her laptop.

JANE
(looking up from screen)
I think I've got it!"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
          </div>
          
          <div className="field is-grouped">
            <div className="control">
              <button
                className={`button is-primary ${isProcessing ? 'is-loading' : ''}`}
                onClick={processText}
                disabled={!inputText.trim() || isProcessing}
              >
                <i className="fas fa-play"></i>
                &nbsp;Process Text
              </button>
            </div>
            <div className="control">
              <button
                className="button is-light"
                onClick={clearResults}
                disabled={isProcessing}
              >
                <i className="fas fa-trash"></i>
                &nbsp;Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {results && (
        <div className="processor-results">
          {results.error ? (
            <div className="notification is-danger">
              <i className="fas fa-exclamation-triangle"></i>
              &nbsp;{results.error}
            </div>
          ) : (
            <>
              <h4 className="title is-5">Processing Results</h4>
              
              <div className="processing-stats">
                <div className="stat-card">
                  <div className="stat-number">{results.stats.wordCount}</div>
                  <div className="stat-label">Words</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{results.stats.sentenceCount}</div>
                  <div className="stat-label">Sentences</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{results.stats.characterCount}</div>
                  <div className="stat-label">Characters</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{results.sentiment.toFixed(2)}</div>
                  <div className="stat-label">Sentiment</div>
                </div>
              </div>

              <div className="columns is-multiline mt-4">
                <div className="column is-half">
                  <h5 className="title is-6">Nouns Found:</h5>
                  <div className="code-block">
                    {results.nouns.length > 0 ? results.nouns.join(', ') : 'None found'}
                  </div>
                </div>
                <div className="column is-half">
                  <h5 className="title is-6">Verbs Found:</h5>
                  <div className="code-block">
                    {results.verbs.length > 0 ? results.verbs.join(', ') : 'None found'}
                  </div>
                </div>
                <div className="column is-half">
                  <h5 className="title is-6">Characters Detected:</h5>
                  <div className="code-block">
                    {results.fountainElements.characters.length > 0 
                      ? results.fountainElements.characters.join(', ') 
                      : 'None detected'}
                  </div>
                </div>
                <div className="column is-half">
                  <h5 className="title is-6">Dialogue Lines:</h5>
                  <div className="code-block">
                    {results.fountainElements.dialogue.length} potential dialogue lines found
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default FountainProcessor