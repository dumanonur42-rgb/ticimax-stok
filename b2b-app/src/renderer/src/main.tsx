import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { SplashWindow } from './components/Brand'
import './styles.css'

const isSplash = new URLSearchParams(location.search).get('splash') === '1'
if (isSplash) document.documentElement.classList.add('splash-window')

createRoot(document.getElementById('root')!).render(<StrictMode>{isSplash ? <SplashWindow /> : <App />}</StrictMode>)
