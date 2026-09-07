import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

function syncViewportSize() {
  const viewport = window.visualViewport
  const width = Math.round(viewport?.width ?? window.innerWidth)
  const height = Math.round(viewport?.height ?? window.innerHeight)
  const root = document.documentElement
  root.style.setProperty('--app-width', `${width}px`)
  root.style.setProperty('--app-height', `${height}px`)
}

syncViewportSize()
window.addEventListener('resize', syncViewportSize)
window.addEventListener('orientationchange', syncViewportSize)
window.visualViewport?.addEventListener('resize', syncViewportSize)
window.visualViewport?.addEventListener('scroll', syncViewportSize)

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
