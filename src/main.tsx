import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { StoreProvider } from './store'
import '@fontsource/big-shoulders-display/latin-700'
import '@fontsource/big-shoulders-display/latin-800'
import '@fontsource/instrument-sans/latin-400'
import '@fontsource/instrument-sans/latin-500'
import '@fontsource/instrument-sans/latin-600'
import '@fontsource/instrument-sans/latin-700'
import '@fontsource/jetbrains-mono/latin-500'
import '@fontsource/jetbrains-mono/latin-700'
import './styles.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>
)
