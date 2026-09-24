import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startBackendPolling } from './sim/backendApi'
import { startDashboardSync } from './sim/dashboardSync'

// Live data wiring: REST polling + sim/cab-socket → dashboard store bridge.
startBackendPolling()
startDashboardSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
