import { useEffect, useRef, useState } from 'react'

export type LiveEvent =
  | { type: 'orders'; table?: string; fresh?: boolean }
  | { type: 'menu' }
  | { type: 'calls'; table?: string; kind?: 'waiter' | 'bill' }
  | { type: 'tables' }

/**
 * Realtime channel to the Hub Durable Object.
 * - `query` picks the channel: "t=<tableToken>" for a table, "" for staff (cookie auth). null = don't connect.
 * - `sync` runs on (re)connect, when the tab becomes visible and every 30 s as a safety net,
 *   so a dropped message only ever delays a screen, never leaves it wrong.
 */
export function useLive(query: string | null, onEvent: (e: LiveEvent) => void, sync: () => void): boolean {
  const [online, setOnline] = useState(false)
  const ev = useRef(onEvent)
  const sy = useRef(sync)
  useEffect(() => {
    ev.current = onEvent
    sy.current = sync
  })

  useEffect(() => {
    if (query === null) return
    let ws: WebSocket | null = null
    let stopped = false
    let retry = 0
    let retryTimer = 0
    let pingTimer = 0

    const connect = () => {
      if (stopped) return
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      ws = new WebSocket(`${proto}://${location.host}/api/ws${query ? `?${query}` : ''}`)
      ws.onopen = () => {
        retry = 0
        setOnline(true)
        sy.current()
        clearInterval(pingTimer)
        pingTimer = window.setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send('ping'), 25_000)
      }
      ws.onmessage = (m) => {
        if (m.data === 'pong') return
        try {
          ev.current(JSON.parse(String(m.data)) as LiveEvent)
        } catch {
          /* ignore junk */
        }
      }
      ws.onclose = () => {
        setOnline(false)
        clearInterval(pingTimer)
        if (stopped) return
        retry = Math.min(retry + 1, 5)
        retryTimer = window.setTimeout(connect, 2 ** retry * 500)
      }
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      sy.current()
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        clearTimeout(retryTimer)
        retry = 0
        connect()
      }
    }

    connect()
    const poll = window.setInterval(() => document.visibilityState === 'visible' && sy.current(), 30_000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      clearTimeout(retryTimer)
      clearInterval(pingTimer)
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      ws?.close()
    }
  }, [query])

  return online
}

/** re-render every `ms` (for "5 นาทีที่แล้ว" labels) */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export const ago = (now: number, at: number) => {
  const m = Math.max(0, Math.floor((now - at) / 60_000))
  return m < 1 ? 'เมื่อสักครู่' : m < 60 ? `${m} นาที` : `${Math.floor(m / 60)} ชม. ${m % 60} นาที`
}
