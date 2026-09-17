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
        token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9qZWN0SWQiOiI2YWFhZWI2MWI0NGMzZTUyZTlmYmE0NDMiLCJ0eXBlIjoiaW5nZXN0b3IiLCJpYXQiOjE3ODk1ODYyNzUsImV4cCI6MTc5NzM2MjI3NX0._qolfywX2LkGPzpOiMa9dcZCGLAAGgzCksrUcwobmyE" 
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
