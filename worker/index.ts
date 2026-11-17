import { Hono, type Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import {
  MAX_LINES,
  NEXT,
  ORDER_STATUSES,
  PRESET_IDS,
  checkPicks,
  cleanNote,
  dayStart,
  presetGroups,
  validQty,
  type Art,
  type Category,
  type MenuItem,
  type OrderStatus,
  type Picks,
} from '../shared/menu'
import type {
  CallView,
  KitchenResponse,
  MenuResponse,
  OrderView,
  QrTable,
  SalesResponse,
  TableState,
  TableSummary,
} from '../shared/types'
import { COOKIE, SESSION_MS, makeToken, safeEqual, verifyToken } from './auth'
import { refreshIfStale, resetDemo, touch } from './demo'
import type { HubEvent } from './hub'
import { DEMO_TABLE } from './seed'

export { Hub } from './hub'

type App = { Bindings: Env }
type Ctx = Context<App>

const app = new Hono<App>().basePath('/api')

const ACTIVE: OrderStatus[] = ['new', 'cooking', 'ready']
const ART_RE = /^[a-z]{2,16}$/

// ---------- helpers ----------

async function readJson<T extends object>(c: Ctx): Promise<T> {
  try {
    const v: unknown = await c.req.json()
    return (v && typeof v === 'object' ? v : {}) as T
  } catch {
    return {} as T
  }
}

const err = (c: Ctx, status: 400 | 401 | 403 | 404 | 409 | 429, message: string) => c.json({ error: message }, status)

async function limited(limiter: RateLimit, c: Ctx, scope = ''): Promise<boolean> {
  const ip = c.req.header('cf-connecting-ip') ?? 'local'
  const { success } = await limiter.limit({ key: scope + ip })
  return !success
}

const hub = (env: Env) => env.HUB.get(env.HUB.idFromName('main'))

/** fire-and-forget realtime hint; never fails the request. Every mutation emits, so it also marks demo activity. */
function emit(c: Ctx, tags: string[], event: HubEvent) {
  c.executionCtx.waitUntil(hub(c.env).broadcast(tags, event).catch((e) => console.error('broadcast', e)))
  if (c.env.DEMO === '1') c.executionCtx.waitUntil(touch(c.env.DB).then(() => undefined, (e) => console.error('touch', e)))
}

/** public demo: re-seed stale data when a visitor arrives (see demo.ts) */
async function freshDemo(c: Ctx) {
  if (c.env.DEMO === '1' && (await refreshIfStale(c.env.DB))) {
    emit(c, ['staff', 'tables'], { type: 'tables' })
  }
}

interface ItemRow {
  id: number
  category_id: number
  name: string
  desc: string
  price: number
  art: string
  presets: string
  available: number
  sort: number
}

function parsePresets(raw: string): string[] {
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && PRESET_IDS.includes(x)) : []
  } catch {
    return []
  }
}

function toItem(r: ItemRow): MenuItem {
  const presets = parsePresets(r.presets)
  return { ...r, art: r.art as Art, presets, options: presetGroups(presets), available: r.available === 1 }
}

async function loadMenu(db: D1Database): Promise<MenuResponse> {
  const [cats, items] = await db.batch([
    db.prepare('SELECT id, name, sort FROM categories ORDER BY sort, id'),
    db.prepare('SELECT * FROM items ORDER BY category_id, sort, id'),
  ])
  return { categories: cats.results as Category[], items: (items.results as ItemRow[]).map(toItem) }
}

interface OrderRow {
  id: number
  table_id: number
  table_label: string
  status: OrderStatus
  total: number
  created_at: number
  updated_at: number
}

/** orders + their lines, two queries total */
async function loadOrders(db: D1Database, where: string, binds: unknown[]): Promise<OrderView[]> {
  const { results: orders } = await db
    .prepare(
      `SELECT o.id, o.table_id, t.label AS table_label, o.status, o.total, o.created_at, o.updated_at
       FROM orders o JOIN tables t ON t.id = o.table_id WHERE ${where} ORDER BY o.created_at, o.id`,
    )
    .bind(...binds)
    .all<OrderRow>()
  if (orders.length === 0) return []
  const ids = orders.map((o) => o.id)
  const { results: lines } = await db
    .prepare(
      `SELECT order_id, name, qty, unit_price, options, note FROM order_items
       WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`,
    )
    .bind(...ids)
    .all<{ order_id: number; name: string; qty: number; unit_price: number; options: string; note: string }>()
  const by = new Map<number, OrderView['lines']>()
  for (const { order_id, ...l } of lines) by.set(order_id, [...(by.get(order_id) ?? []), l])
  return orders.map((o) => ({ ...o, lines: by.get(o.id) ?? [] }))
}

const billTotal = (orders: OrderView[]) => orders.reduce((s, o) => s + (o.status === 'cancelled' ? 0 : o.total), 0)

async function tableByToken(db: D1Database, token: string) {
  if (!/^[a-z0-9]{6,32}$/.test(token)) return null
  return db.prepare('SELECT id, label FROM tables WHERE token = ?').bind(token).first<{ id: number; label: string }>()
}

async function openSession(db: D1Database, tableId: number) {
  return db
    .prepare('SELECT id, opened_at, bill_requested_at FROM sessions WHERE table_id = ? AND closed_at IS NULL')
    .bind(tableId)
    .first<{ id: number; opened_at: number; bill_requested_at: number | null }>()
}

async function tableState(db: D1Database, table: { id: number; label: string }): Promise<TableState> {
  const session = await openSession(db, table.id)
  const orders = session ? await loadOrders(db, 'o.session_id = ?', [session.id]) : []
  const { results: calls } = await db
    .prepare('SELECT kind FROM calls WHERE table_id = ? AND resolved_at IS NULL')
    .bind(table.id)
    .all<{ kind: string }>()
  return {
    table,
    session,
    orders,
    total: billTotal(orders),
    calls: { waiter: calls.some((x) => x.kind === 'waiter'), bill: calls.some((x) => x.kind === 'bill') },
  }
}

// ---------- public: menu, table, ordering ----------

app.get('/menu', async (c) => {
  c.header('cache-control', 'no-store')
  return c.json(await loadMenu(c.env.DB))
})

/** demo landing page needs one table link; real deployments get links only from printed QR codes */
app.get('/demo', async (c) => {
  if (c.env.DEMO !== '1') return err(c, 404, 'not found')
  await freshDemo(c)
  const row = await c.env.DB.prepare('SELECT token FROM tables WHERE id = ?').bind(DEMO_TABLE).first<{ token: string }>()
  return c.json({ table: DEMO_TABLE, token: row?.token ?? null })
})

app.get('/t/:token', async (c) => {
  const table = await tableByToken(c.env.DB, c.req.param('token'))
  if (!table) return err(c, 404, 'ไม่พบโต๊ะนี้ ลองสแกน QR ใหม่อีกครั้ง')
  return c.json(await tableState(c.env.DB, table))
})

interface OrderBody {
  lines?: { item_id?: unknown; qty?: unknown; picks?: unknown; note?: unknown }[]
}

app.post('/t/:token/orders', async (c) => {
  const db = c.env.DB
  const table = await tableByToken(db, c.req.param('token'))
  if (!table) return err(c, 404, 'ไม่พบโต๊ะนี้ ลองสแกน QR ใหม่อีกครั้ง')
  if (await limited(c.env.ORDER_LIMITER, c)) return err(c, 429, 'สั่งถี่เกินไป รอสักครู่แล้วลองใหม่')

  const { lines } = await readJson<OrderBody>(c)
  if (!Array.isArray(lines) || lines.length === 0) return err(c, 400, 'ตะกร้าว่าง')
  if (lines.length > MAX_LINES) return err(c, 400, `สั่งได้ครั้งละไม่เกิน ${MAX_LINES} รายการ`)

  const ids = [...new Set(lines.map((l) => Number(l.item_id)).filter(Number.isInteger))]
  if (ids.length === 0) return err(c, 400, 'ไม่พบเมนู')
  const { results } = await db
    .prepare(`SELECT * FROM items WHERE id IN (${ids.map(() => '?').join(',')})`)
    .bind(...ids)
    .all<ItemRow>()
  const items = new Map(results.map((r) => [r.id, toItem(r)]))

  const priced: { item: MenuItem; qty: number; unit: number; text: string; note: string }[] = []
  const soldOut: string[] = []
  for (const l of lines) {
    const item = items.get(Number(l.item_id))
    if (!item) return err(c, 409, 'มีเมนูที่ถูกลบไปแล้ว กรุณาเลือกใหม่')
    if (!item.available) {
      soldOut.push(item.name)
      continue
    }
    if (!validQty(l.qty)) return err(c, 400, `${item.name}: จำนวนไม่ถูกต้อง`)
    const picks = (l.picks && typeof l.picks === 'object' ? l.picks : {}) as Picks
    const r = checkPicks(item, picks)
    if (!r.ok) return err(c, 400, r.error)
    priced.push({ item, qty: l.qty, unit: r.unit, text: r.text, note: cleanNote(l.note) })
  }
  if (soldOut.length) return c.json({ error: `ขออภัย ${soldOut.join(', ')} หมดแล้ว`, sold_out: soldOut }, 409)

  const total = priced.reduce((s, p) => s + p.unit * p.qty, 0)
  const now = Date.now()
  // One transaction: open a sitting if needed (partial unique index keeps it single),
  // insert the order into that sitting, then its lines.
  const lastOrder = '(SELECT id FROM orders WHERE table_id = ? ORDER BY id DESC LIMIT 1)'
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO sessions (table_id, opened_at) VALUES (?, ?)').bind(table.id, now),
    db
      .prepare(
        `INSERT INTO orders (session_id, table_id, total, created_at, updated_at)
         VALUES ((SELECT id FROM sessions WHERE table_id = ? AND closed_at IS NULL), ?, ?, ?, ?)`,
      )
      .bind(table.id, table.id, total, now, now),
    ...priced.map((p) =>
      db
        .prepare(
          `INSERT INTO order_items (order_id, item_id, name, qty, unit_price, options, note)
           VALUES (${lastOrder}, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(table.id, p.item.id, p.item.name, p.qty, p.unit, p.text, p.note),
    ),
  ])

  emit(c, ['staff', `t:${table.id}`], { type: 'orders', table: table.label, fresh: true })
  return c.json(await tableState(db, table), 201)
})

app.post('/t/:token/call', async (c) => {
  const db = c.env.DB
  const table = await tableByToken(db, c.req.param('token'))
  if (!table) return err(c, 404, 'ไม่พบโต๊ะนี้')
  const { kind } = await readJson<{ kind?: string }>(c)
  if (kind !== 'waiter' && kind !== 'bill') return err(c, 400, 'คำขอไม่ถูกต้อง')
  if (await limited(c.env.CALL_LIMITER, c)) return err(c, 429, 'กดถี่เกินไป พนักงานได้รับแจ้งแล้ว')

  const now = Date.now()
  if (kind === 'bill') {
    const s = await openSession(db, table.id)
    if (!s) return err(c, 409, 'โต๊ะนี้ยังไม่มีรายการสั่ง')
    await db.prepare('UPDATE sessions SET bill_requested_at = COALESCE(bill_requested_at, ?) WHERE id = ?').bind(now, s.id).run()
  }
  // no duplicate open call of the same kind
  await db
    .prepare(
      `INSERT INTO calls (table_id, kind, created_at)
       SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM calls WHERE table_id = ? AND kind = ? AND resolved_at IS NULL)`,
    )
    .bind(table.id, kind, now, table.id, kind)
    .run()

  emit(c, ['staff', `t:${table.id}`], { type: 'calls', table: table.label, kind })
  return c.json(await tableState(db, table))
})

// ---------- realtime ----------

app.get('/ws', async (c) => {
  if (c.req.header('upgrade') !== 'websocket') return err(c, 400, 'expected websocket')
  let tags: string[]
  const token = c.req.query('t')
  if (token) {
    const table = await tableByToken(c.env.DB, token)
    if (!table) return err(c, 404, 'ไม่พบโต๊ะนี้')
    tags = ['tables', `t:${table.id}`]
  } else {
    if (!(await verifyToken(c.env.SESSION_SECRET, getCookie(c, COOKIE)))) return err(c, 401, 'กรุณาเข้าสู่ระบบ')
    tags = ['staff']
  }
  const headers = new Headers(c.req.raw.headers)
  headers.set('x-hub-tags', tags.join(','))
  return hub(c.env).fetch(new Request(c.req.url, { headers }))
})

// ---------- staff auth ----------

app.post('/staff/login', async (c) => {
  if (await limited(c.env.LOGIN_LIMITER, c)) return err(c, 429, 'ลองรหัสผ่านบ่อยเกินไป รอ 1 นาที')
  const { password = '' } = await readJson<{ password?: string }>(c)
  if (typeof password !== 'string' || !(await safeEqual(password, c.env.ADMIN_PASSWORD)))
    return err(c, 401, 'รหัสผ่านไม่ถูกต้อง')
  setCookie(c, COOKIE, await makeToken(c.env.SESSION_SECRET), {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Strict',
    path: '/api',
    maxAge: SESSION_MS / 1000,
  })
  return c.json({ ok: true })
})

app.post('/staff/logout', (c) => {
  deleteCookie(c, COOKIE, { path: '/api' })
  return c.json({ ok: true })
})

app.get('/staff/session', async (c) =>
  c.json({ in: await verifyToken(c.env.SESSION_SECRET, getCookie(c, COOKIE)), demo: c.env.DEMO === '1' }),
)

app.use('/staff/*', async (c, next) => {
  if (!(await verifyToken(c.env.SESSION_SECRET, getCookie(c, COOKIE)))) return err(c, 401, 'กรุณาเข้าสู่ระบบ')
  await next()
})

// ---------- staff: kitchen ----------

async function openCalls(db: D1Database): Promise<CallView[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id, c.table_id, t.label AS table_label, c.kind, c.created_at
       FROM calls c JOIN tables t ON t.id = c.table_id WHERE c.resolved_at IS NULL ORDER BY c.created_at`,
    )
    .all<CallView>()
  return results
}

app.get('/staff/kitchen', async (c) => {
  await freshDemo(c)
  const db = c.env.DB
  const [orders, calls] = await Promise.all([
    loadOrders(db, `o.status IN (${ACTIVE.map(() => '?').join(',')})`, ACTIVE),
    openCalls(db),
  ])
  return c.json<KitchenResponse>({ orders, calls, now: Date.now() })
})

app.patch('/staff/orders/:id', async (c) => {
  const db = c.env.DB
  const id = Number(c.req.param('id'))
  const { status } = await readJson<{ status?: OrderStatus }>(c)
  if (!status || !ORDER_STATUSES.includes(status)) return err(c, 400, 'สถานะไม่ถูกต้อง')
  const o = await db
    .prepare('SELECT o.status, o.table_id, t.label FROM orders o JOIN tables t ON t.id = o.table_id WHERE o.id = ?')
    .bind(id)
    .first<{ status: OrderStatus; table_id: number; label: string }>()
  if (!o) return err(c, 404, 'ไม่พบออเดอร์')
  if (!NEXT[o.status].includes(status)) return err(c, 409, 'ออเดอร์นี้ถูกเปลี่ยนสถานะไปแล้ว')
  // compare-and-set so two kitchen screens can't double-advance
  const r = await db
    .prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?')
    .bind(status, Date.now(), id, o.status)
    .run()
  if (r.meta.changes === 0) return err(c, 409, 'ออเดอร์นี้ถูกเปลี่ยนสถานะไปแล้ว')
  emit(c, ['staff', `t:${o.table_id}`], { type: 'orders', table: o.label })
  return c.json({ ok: true })
})

app.post('/staff/calls/:id/resolve', async (c) => {
  const db = c.env.DB
  const row = await db
    .prepare('UPDATE calls SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL RETURNING table_id')
    .bind(Date.now(), Number(c.req.param('id')))
    .first<{ table_id: number }>()
  if (row) emit(c, ['staff', `t:${row.table_id}`], { type: 'calls' })
  return c.json({ ok: true })
})

// ---------- staff: tables & bills ----------

app.get('/staff/tables', async (c) => {
  await freshDemo(c)
  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.label, s.id AS session_id, s.opened_at, s.bill_requested_at,
            COALESCE((SELECT SUM(total) FROM orders WHERE session_id = s.id AND status != 'cancelled'), 0) AS total,
            (SELECT COUNT(*) FROM orders WHERE session_id = s.id AND status != 'cancelled') AS orders,
            (SELECT COUNT(*) FROM orders WHERE session_id = s.id AND status IN ('new', 'cooking', 'ready')) AS pending,
            (SELECT COUNT(*) FROM calls WHERE table_id = t.id AND resolved_at IS NULL) AS calls
     FROM tables t LEFT JOIN sessions s ON s.table_id = t.id AND s.closed_at IS NULL
     ORDER BY t.id`,
  ).all<TableSummary>()
  return c.json({ tables: results })
})

app.get('/staff/tables/:id', async (c) => {
  const table = await c.env.DB.prepare('SELECT id, label FROM tables WHERE id = ?')
    .bind(Number(c.req.param('id')))
    .first<{ id: number; label: string }>()
  if (!table) return err(c, 404, 'ไม่พบโต๊ะ')
  return c.json(await tableState(c.env.DB, table))
})

app.post('/staff/tables/:id/close', async (c) => {
  const db = c.env.DB
  const tableId = Number(c.req.param('id'))
  const { session_id } = await readJson<{ session_id?: number }>(c)
  const s = await openSession(db, tableId)
  // session_id guards against closing a newer sitting than the bill the cashier was looking at
  if (!s || s.id !== session_id) return err(c, 409, 'บิลนี้ถูกปิดไปแล้ว หรือมีลูกค้าใหม่ — โหลดใหม่อีกครั้ง')
  const now = Date.now()
  await db.batch([
    db
      .prepare(
        `UPDATE sessions SET closed_at = ?,
           paid_total = COALESCE((SELECT SUM(total) FROM orders WHERE session_id = ? AND status != 'cancelled'), 0)
         WHERE id = ? AND closed_at IS NULL`,
      )
      .bind(now, s.id, s.id),
    db.prepare(`UPDATE orders SET status = 'served', updated_at = ? WHERE session_id = ? AND status IN ('ready')`).bind(now, s.id),
    db.prepare('UPDATE calls SET resolved_at = ? WHERE table_id = ? AND resolved_at IS NULL').bind(now, tableId),
  ])
  emit(c, ['staff', `t:${tableId}`], { type: 'tables' })
  return c.json({ ok: true })
})

app.get('/staff/qr', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, label, token FROM tables ORDER BY id').all<QrTable>()
  return c.json({ tables: results })
})

// ---------- staff: menu editor ----------

app.get('/staff/menu', async (c) => c.json(await loadMenu(c.env.DB)))

interface ItemBody {
  name?: unknown
  desc?: unknown
  price?: unknown
  category_id?: unknown
  art?: unknown
  presets?: unknown
  available?: unknown
}

/** validate a full or partial item; returns column→value pairs */
async function itemFields(db: D1Database, b: ItemBody, partial: boolean): Promise<Record<string, unknown> | string> {
  const out: Record<string, unknown> = {}
  if (b.name !== undefined || !partial) {
    const name = cleanNote(b.name).slice(0, 60)
    if (!name) return 'กรุณาใส่ชื่อเมนู'
    out.name = name
  }
  if (b.desc !== undefined) out.desc = cleanNote(b.desc).slice(0, 120)
  if (b.price !== undefined || !partial) {
    if (!Number.isInteger(b.price) || (b.price as number) < 0 || (b.price as number) > 100_000) return 'ราคาไม่ถูกต้อง'
    out.price = b.price
  }
  if (b.category_id !== undefined || !partial) {
    const cat = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(Number(b.category_id)).first()
    if (!cat) return 'ไม่พบหมวดหมู่'
    out.category_id = Number(b.category_id)
  }
  if (b.art !== undefined) {
    if (typeof b.art !== 'string' || !ART_RE.test(b.art)) return 'รูปไม่ถูกต้อง'
    out.art = b.art
  }
  if (b.presets !== undefined) {
    if (!Array.isArray(b.presets) || !b.presets.every((p) => typeof p === 'string' && PRESET_IDS.includes(p)))
      return 'ตัวเลือกไม่ถูกต้อง'
    out.presets = JSON.stringify([...new Set(b.presets)])
  }
  if (b.available !== undefined) {
    if (typeof b.available !== 'boolean') return 'สถานะไม่ถูกต้อง'
    out.available = b.available ? 1 : 0
  }
  return out
}

app.post('/staff/items', async (c) => {
  const db = c.env.DB
  const f = await itemFields(db, await readJson<ItemBody>(c), false)
  if (typeof f === 'string') return err(c, 400, f)
  const cols = Object.keys(f)
  const row = await db
    .prepare(
      `INSERT INTO items (${cols.join(', ')}, sort)
       VALUES (${cols.map(() => '?').join(', ')}, (SELECT COALESCE(MAX(sort), 0) + 1 FROM items))
       RETURNING *`,
    )
    .bind(...Object.values(f))
    .first<ItemRow>()
  emit(c, ['staff', 'tables'], { type: 'menu' })
  return c.json(toItem(row!), 201)
})

app.patch('/staff/items/:id', async (c) => {
  const db = c.env.DB
  const f = await itemFields(db, await readJson<ItemBody>(c), true)
  if (typeof f === 'string') return err(c, 400, f)
  const cols = Object.keys(f)
  if (cols.length === 0) return err(c, 400, 'ไม่มีอะไรเปลี่ยน')
  const row = await db
    .prepare(`UPDATE items SET ${cols.map((k) => `${k} = ?`).join(', ')} WHERE id = ? RETURNING *`)
    .bind(...Object.values(f), Number(c.req.param('id')))
    .first<ItemRow>()
  if (!row) return err(c, 404, 'ไม่พบเมนู')
  emit(c, ['staff', 'tables'], { type: 'menu' })
  return c.json(toItem(row))
})

app.delete('/staff/items/:id', async (c) => {
  // old bills keep their snapshot name/price, so deleting is safe
  await c.env.DB.prepare('DELETE FROM items WHERE id = ?').bind(Number(c.req.param('id'))).run()
  emit(c, ['staff', 'tables'], { type: 'menu' })
  return c.json({ ok: true })
})

// ---------- staff: sales ----------

app.get('/staff/sales', async (c) => {
  const db = c.env.DB
  const from = dayStart(Date.now())
  const [closed, open, top] = await db.batch([
    db.prepare('SELECT closed_at, paid_total FROM sessions WHERE closed_at >= ?').bind(from),
    db.prepare(
      `SELECT COUNT(DISTINCT s.id) AS n, COALESCE(SUM(o.total), 0) AS total
       FROM sessions s LEFT JOIN orders o ON o.session_id = s.id AND o.status != 'cancelled'
       WHERE s.closed_at IS NULL`,
    ),
    db
      .prepare(
        `SELECT oi.name, SUM(oi.qty) AS qty, SUM(oi.qty * oi.unit_price) AS revenue
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.created_at >= ? AND o.status != 'cancelled'
         GROUP BY oi.name ORDER BY qty DESC, revenue DESC LIMIT 5`,
      )
      .bind(from),
  ])
  const bills = closed.results as { closed_at: number; paid_total: number }[]
  const hours = new Map<number, number>()
  for (const b of bills) {
    const h = Math.floor((b.closed_at - from) / 3600_000)
    hours.set(h, (hours.get(h) ?? 0) + b.paid_total)
  }
  const o = open.results[0] as { n: number; total: number }
  return c.json<SalesResponse>({
    bills: bills.length,
    revenue: bills.reduce((s, b) => s + b.paid_total, 0),
    open_total: o.total,
    open_tables: o.n,
    top: top.results as SalesResponse['top'],
    by_hour: [...hours].sort((a, b) => a[0] - b[0]).map(([hour, revenue]) => ({ hour, revenue })),
  })
})

app.post('/staff/reset-demo', async (c) => {
  if (c.env.DEMO !== '1') return err(c, 403, 'ปิดใช้งาน')
  await resetDemo(c.env.DB)
  emit(c, ['staff', 'tables'], { type: 'menu' })
  emit(c, ['staff', 'tables'], { type: 'tables' })
  return c.json({ ok: true })
})

app.notFound((c) => err(c, 404, 'not found'))
app.onError((e, c) => {
  console.error(e)
  return c.json({ error: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' }, 500)
})

export default {
  fetch: app.fetch,
  async scheduled(_event, env, ctx) {
    if (env.DEMO !== '1') return
    await resetDemo(env.DB)
    ctx.waitUntil(hub(env).broadcast(['staff', 'tables'], { type: 'tables' }))
  },
} satisfies ExportedHandler<Env>
