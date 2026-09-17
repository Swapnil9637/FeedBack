import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { HelmetProvider } from 'react-helmet-async'
import { TracePilotProvider } from '@swapnil454/tracepilot/react'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <TracePilotProvider 
        token="YOUR_PROJECT_TRACKING_ID" 
        serviceName="FeedBack-Frontend"
        ingestorUrl="https://deployraai.onrender.com/api/observability/traces/v1/traces"
        rumUrl="https://deployraai.onrender.com/api/observability/traces/v1/rum"
        enableSessionReplay={true}
      >
        <App />
      </TracePilotProvider>
    </HelmetProvider>
  </StrictMode>,
)
