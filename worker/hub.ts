import { DurableObject } from 'cloudflare:workers'

/**
 * Realtime fan-out. One instance ("main") holds every open WebSocket using the hibernation API,
 * so idle sockets cost nothing. Sockets are tagged:
 *   staff        — kitchen screen / back office
 *   tables       — every customer phone (menu changes)
 *   t:<tableId>  — phones at one table (their orders / bill)
 * Messages are tiny "something changed" hints; clients refetch over HTTP, so a missed
 * message can never leave a screen in a wrong state for long.
 */
export class Hub extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // keep-alive pings are answered without waking the object
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 })
    const tags = (req.headers.get('x-hub-tags') ?? '').split(',').filter(Boolean)
    if (tags.length === 0) return new Response('no tags', { status: 400 })
    const { 0: client, 1: server } = new WebSocketPair()
    this.ctx.acceptWebSocket(server, tags)
    return new Response(null, { status: 101, webSocket: client })
  }

  async broadcast(tags: string[], event: HubEvent): Promise<void> {
    const msg = JSON.stringify(event)
    const seen = new Set<WebSocket>()
    for (const tag of tags) {
      for (const ws of this.ctx.getWebSockets(tag)) {
        if (seen.has(ws)) continue
        seen.add(ws)
        try {
          ws.send(msg)
        } catch {
          // socket already closing; hibernation cleans it up
        }
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code, 'bye')
    } catch {
      // already closed
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close(1011, 'error')
    } catch {
      // already closed
    }
  }
}

export type HubEvent =
  | { type: 'orders'; table?: string; fresh?: boolean }
  | { type: 'menu' }
  | { type: 'calls'; table?: string; kind?: 'waiter' | 'bill' }
  | { type: 'tables' }
