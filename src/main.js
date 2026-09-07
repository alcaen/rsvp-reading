import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

function refreshLayout() {
  window.scrollTo(0, 0)
  window.dispatchEvent(new Event('resize'))
}

window.addEventListener('orientationchange', () => {
  refreshLayout()
  // iOS reports the old viewport first; refresh again after it settles.
  setTimeout(refreshLayout, 150)
  setTimeout(refreshLayout, 400)
})
window.addEventListener('resize', () => window.scrollTo(0, 0))

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
