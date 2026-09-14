import type { ServerMessage } from '../types'

type MessageHandler = (msg: ServerMessage) => void

interface WsClient {
  subscribe: (handler: MessageHandler) => () => void
  disconnect: () => void
}

export function createWsClient(): WsClient {
  const handlers = new Set<MessageHandler>()
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let backoffMs = 500
  let destroyed = false

  function connect() {
    if (destroyed) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws`
    console.log('[ws] connecting to', url)

    try {
      ws = new WebSocket(url)
    } catch (err) {
      console.error('[ws] failed to construct WebSocket:', err)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      console.log('[ws] connected')
      backoffMs = 500
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage
        handlers.forEach((h) => h(msg))
      } catch (err) {
        console.warn('[ws] failed to parse message:', err)
      }
    }

    ws.onclose = () => {
      console.log('[ws] disconnected')
      ws = null
      scheduleReconnect()
    }

    ws.onerror = (err) => {
      console.warn('[ws] error:', err)
    }
  }

  function scheduleReconnect() {
    if (destroyed) return
    if (reconnectTimer != null) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      backoffMs = Math.min(backoffMs * 2, 5000)
      connect()
    }, backoffMs)
  }

  connect()

  return {
    subscribe(handler: MessageHandler): () => void {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    disconnect() {
      destroyed = true
      if (reconnectTimer != null) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      ws?.close()
      ws = null
    },
  }
}
