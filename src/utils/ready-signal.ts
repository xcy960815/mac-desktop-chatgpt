interface ReadySignal {
  isReady(): boolean
  markReady(): void
  waitUntilReady(timeoutMs?: number): Promise<boolean>
}

export const createReadySignal = (): ReadySignal => {
  let ready = false
  const listeners = new Set<() => void>()

  const notifyReady = () => {
    for (const listener of listeners) {
      listener()
    }
    listeners.clear()
  }

  return {
    isReady: () => ready,
    markReady: () => {
      if (ready) {
        return
      }

      ready = true
      notifyReady()
    },
    waitUntilReady: (timeoutMs = 0) => {
      if (ready) {
        return Promise.resolve(true)
      }

      return new Promise<boolean>((resolve) => {
        let timeoutId: NodeJS.Timeout | null = null

        const finish = (result: boolean) => {
          listeners.delete(onReady)
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          resolve(result)
        }

        const onReady = () => finish(true)

        listeners.add(onReady)

        if (timeoutMs > 0) {
          timeoutId = setTimeout(() => {
            finish(ready)
          }, timeoutMs)
        }
      })
    }
  }
}
