import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [apiHealth, setApiHealth] = useState(null)

  useEffect(() => {
    // Check API health on component mount
    fetch('/api/health')
      .then(response => response.json())
      .then(data => setApiHealth(data))
      .catch(error => {
        console.error('API health check failed:', error)
        setApiHealth({ status: 'error', message: 'API unavailable' })
      })
  }, [])

  return (
    <div className="fountain-app">
      <div className="notification is-success is-light">
        <h4 className="title is-5">
          <i className="fas fa-react"></i>
          Hello World - React App Loaded!
        </h4>
        <p>
          Welcome to the Fountain Parser React application. This is a simple Hello World app.
        </p>
        {apiHealth && (
          <div className="mt-3">
            <strong>API Status:</strong> 
            <span className={`tag ${apiHealth.status === 'ok' ? 'is-success' : 'is-danger'}`}>
              {apiHealth.status}
            </span>
            {apiHealth.message && <span className="ml-2">{apiHealth.message}</span>}
          </div>
        )}
      </div>

      <div className="box">
        <h3 className="title is-4">Simple React Component</h3>
        <p>This is a basic React component to test that everything is working correctly.</p>
        <button className="button is-primary" onClick={() => alert('Hello from React!')}>
          <i className="fas fa-hand-wave"></i>
          Click Me!
        </button>
      </div>
    </div>
  )
}

export default App