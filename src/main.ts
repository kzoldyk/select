import { createApp, type Directive } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/tailwind.css'
import { initCuelume, syncSoundsEnabled } from './lib/cuelume'
import { useUiStore } from './stores/ui'

const cuelumeDirective: Directive<HTMLElement, string | undefined> = {
  mounted(el, binding) {
    const mode = binding.arg ?? 'press'
    if (mode === 'press') {
      el.setAttribute('data-cuelume-press', '')
      el.setAttribute('data-cuelume-release', '')
    } else if (mode === 'hover') {
      el.setAttribute('data-cuelume-hover', binding.value ?? 'tick')
    } else if (mode === 'toggle') {
      el.setAttribute('data-cuelume-toggle', '')
    }
  },
}

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
if (typeof window !== 'undefined') {
  ;(window as any).$pinia = pinia
}
app.directive('cuelume', cuelumeDirective)

initCuelume()
syncSoundsEnabled(useUiStore(pinia).soundsEnabled)

app.mount('#app')
