import { afterEach, expect, it, vi } from 'vitest'
import { Model, ModelUrl } from '@/utils/constants.js'

class Element extends EventTarget {
  classList = {
    active: false,
    add() {
      this.active = true
    },
    remove() {
      this.active = false
    },
    contains() {
      return this.active
    }
  }
  src = ''
  reload = vi.fn()
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.resetModules()
})

it('clears loading after retry and reloads the current page through the tray', async () => {
  const webview = new Element()
  const loading = new Element()
  const error = new Element()
  const retry = new Element()
  const elements: Record<string, Element> = {
    'webview-container': webview,
    'webview-loading': loading,
    'webview-error': error,
    'retry-button': retry,
    'error-message': new Element()
  }
  const onModelChanged = vi.fn()
  const onReloadCurrentModel = vi.fn()
  vi.stubGlobal('document', {
    body: new Element(),
    getElementById: (id: string) => elements[id]
  })
  vi.stubGlobal('window', {
    electronAPI: { onModelChanged, onReloadCurrentModel }
  })
  vi.useFakeTimers()
  await import('@/renderer.js')
  onModelChanged.mock.calls[0][0](Model.Qwen)
  expect(webview.src).toBe(ModelUrl.Qwen)
  webview.dispatchEvent(
    Object.assign(new Event('did-fail-load'), {
      isMainFrame: true,
      errorCode: -7
    })
  )
  webview.dispatchEvent(new Event('did-stop-loading'))
  expect(error.classList.active).toBe(true)
  retry.dispatchEvent(new Event('click'))
  expect(loading.classList.active).toBe(true)
  expect(error.classList.active).toBe(false)
  webview.dispatchEvent(new Event('did-stop-loading'))
  expect(loading.classList.active).toBe(false)
  vi.advanceTimersByTime(5000)
  expect(webview.reload).toHaveBeenCalledTimes(1)
  onReloadCurrentModel.mock.calls[0][0]()
  expect(webview.reload).toHaveBeenCalledTimes(2)
})
