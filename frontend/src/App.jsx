import React, { useState, useEffect } from 'react'
import FountainProcessor from './components/FountainProcessor'
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
          Welcome to the Fountain Parser React application. This app includes lexicological 
          processing capabilities for analyzing screenplay text.
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

      <FountainProcessor />
    </div>
  )
}

export default App