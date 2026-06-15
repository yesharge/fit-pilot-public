import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import App from '@/components/App/App'
import Home from '@/pages/Home/Home'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App>
      <Home />
    </App>
  </StrictMode>,
)
