import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Disable React Router devtools in production
if (import.meta.env.PROD) {
  // @ts-ignore
  window.__REACT_ROUTER_DEVTOOLS__ = { enabled: false };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)