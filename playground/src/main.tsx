import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// import { MiniMap } from './MiniMap/index.tsx'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* <MiniMap></MiniMap> */}
  </StrictMode>,
)
