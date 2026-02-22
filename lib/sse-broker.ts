type Subscriber = {
  id: string
  write: (data: string) => void
}

type EventPayload = {
  type: string
  data?: Record<string, unknown>
}

const ensureStore = () => {
  const globalScope = globalThis as typeof globalThis & {
    __regiSmartSubscribers?: Map<string, Subscriber>
  }
  if (!globalScope.__regiSmartSubscribers) {
    globalScope.__regiSmartSubscribers = new Map()
  }
  return globalScope.__regiSmartSubscribers
}

export const addSubscriber = (subscriber: Subscriber) => {
  const store = ensureStore()
  store.set(subscriber.id, subscriber)
}

export const removeSubscriber = (id: string) => {
  const store = ensureStore()
  store.delete(id)
}

export const broadcastEvent = (payload: EventPayload) => {
  const store = ensureStore()
  const message = `event: ${payload.type}\ndata: ${JSON.stringify(payload.data ?? {})}\n\n`
  store.forEach((subscriber) => {
    subscriber.write(message)
  })
}
