import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { WorkspaceProvider } from './state/WorkspaceContext.jsx'
import './style.css'
createRoot(document.getElementById('app')).render(<StrictMode><WorkspaceProvider><App /></WorkspaceProvider></StrictMode>)
// Cache production bundles only; Vite development modules require a live server.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) navigator.serviceWorker.register('./sw.js').catch(console.error)
  else navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      if (registration.scope === new URL(import.meta.env.BASE_URL, location.href).href) registration.unregister()
    }
  })
}
