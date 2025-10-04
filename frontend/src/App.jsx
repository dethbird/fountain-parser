import React from 'react'
import './App.css'

function App() {
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