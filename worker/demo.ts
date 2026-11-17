// Public demo data: wiped and re-seeded nightly by the cron trigger (and from the back office).
import { checkPicks, dayStart, presetGroups, type Picks } from '../shared/menu'
import { CATEGORIES, ITEMS, TABLE_TOKENS } from './seed'

type Line = [itemNo: number, qty: number, picks?: Picks, note?: string]
type Sitting = {
  table: number
  /** minutes ago the sitting opened */
  opened: number
  /** minutes ago it was paid; undefined = still at the table */
  closed?: number
  billAsked?: number
  orders: { ago: number; status: 'new' | 'cooking' | 'ready' | 'served'; lines: Line[] }[]
  calls?: { kind: 'waiter' | 'bill'; ago: number }[]
}

// item numbers are 1-based positions in ITEMS
const N = (name: string) => ITEMS.findIndex((i) => i[1] === name) + 1

const OPEN: Sitting[] = [
  {
    table: 2,
    opened: 14,
    orders: [
      {
        ago: 12,
        status: 'cooking',
        lines: [
          [N('ก๋วยเตี๋ยวต้มยำหมู'), 2, { noodle: ['small'], size: ['special'], spicy: ['hot'] }],
          [N('ชาไทย'), 2, { drink: ['iced'], sweet: ['less'] }],
        ],
      },
    ],
  },
  {
    table: 3,
    opened: 3,
    orders: [
      {
        ago: 2,
        status: 'new',
        lines: [
          [N('ข้าวกะเพรา'), 1, { meat: ['crispy'], egg: ['fried'], spicy: ['mild'] }, 'ไม่ใส่ถั่วฝักยาว'],
          [N('ข้าวผัด'), 1, { meat: ['shrimp'], egg: [] }],
          [N('น้ำเปล่า'), 2],
        ],
      },
    ],
  },
  {
    table: 7,
    opened: 25,
    orders: [
      {
        ago: 24,
        status: 'served',
        lines: [
          [N('ก๋วยเตี๋ยวเนื้อตุ๋น'), 1, { noodle: ['big'], soup: ['clear'], size: ['normal'] }],
          [N('บะหมี่เกี๊ยวหมูแดง'), 1, { soup: ['dry'], size: ['special'] }],
        ],
      },
      { ago: 9, status: 'ready', lines: [[N('เกี๊ยวทอด'), 1], [N('โอเลี้ยง'), 2, { sweet: ['normal'] }]] },
    ],
  },
  {
    table: 9,
    opened: 41,
    billAsked: 1,
    orders: [
      {
        ago: 40,
        status: 'served',
        lines: [
          [N('ผัดซีอิ๊ว'), 1, { meat: ['pork'], egg: ['fried'] }],
          [N('ราดหน้า'), 1, { meat: ['sea'] }],
          [N('หมูทอดกระเทียม'), 1],
          [N('น้ำอัดลม'), 2],
        ],
      },
      { ago: 18, status: 'served', lines: [[N('บัวลอยไข่หวาน'), 2]] },
    ],
    calls: [{ kind: 'bill', ago: 1 }],
  },
  {
    table: 11,
    opened: 6,
    orders: [
      {
        ago: 5,
        status: 'new',
        lines: [
          [N('ก๋วยเตี๋ยวหมูน้ำตก'), 3, { noodle: ['mee'], size: ['normal'] }, 'ไม่ใส่ผักบุ้ง 1 ชาม'],
          [N('ลูกชิ้นทอด'), 1],
        ],
      },
    ],
    calls: [{ kind: 'waiter', ago: 1 }],
  },
]

/** earlier today, already paid — feeds the sales screen */
const PAID: Sitting[] = [
  [1, 300, [[N('ก๋วยเตี๋ยวหมูน้ำตก'), 2, { noodle: ['small'], size: ['normal'] }], [N('ชาไทย'), 2, { drink: ['iced'] }]]],
  [4, 280, [[N('ข้าวกะเพรา'), 2, { meat: ['pork'], egg: ['fried'] }], [N('น้ำเปล่า'), 2]]],
  [6, 240, [[N('ก๋วยเตี๋ยวเนื้อตุ๋น'), 2, { noodle: ['big'], soup: ['clear'], size: ['special'] }], [N('ทับทิมกรอบ'), 2]]],
  [8, 200, [[N('ข้าวหมูกระเทียม'), 1, { egg: ['fried'] }], [N('ข้าวผัด'), 1, { meat: ['chicken'] }], [N('โอเลี้ยง'), 2]]],
  [10, 150, [[N('ก๋วยเตี๋ยวต้มยำหมู'), 3, { noodle: ['mee'], size: ['normal'] }], [N('ลูกชิ้นทอด'), 1], [N('ชาเขียวนม'), 1, { drink: ['frappe'] }]]],
  [12, 110, [[N('ผัดซีอิ๊ว'), 2, { meat: ['crispy'] }], [N('ไข่เจียวหมูสับ'), 1], [N('น้ำอัดลม'), 2]]],
  [1, 75, [[N('เย็นตาโฟทะเล'), 2, { noodle: ['big'], size: ['normal'] }], [N('ชาไทย'), 2, { drink: ['iced'] }]]],
  [5, 50, [[N('ข้าวกะเพรา'), 1, { meat: ['shrimp'], egg: ['fried'] }], [N('ก๋วยเตี๋ยวหมูน้ำตก'), 1, { noodle: ['egg'], size: ['normal'] }]]],
].map(([table, ago, lines]) => ({
  table: table as number,
  opened: (ago as number) + 35,
  closed: ago as number,
  orders: [{ ago: (ago as number) + 30, status: 'served' as const, lines: lines as Line[] }],
}))

export async function resetDemo(db: D1Database, nowMs = Date.now()): Promise<void> {
  const at = (minAgo: number) => nowMs - minAgo * 60_000
  // paid sittings must stay inside "today" (Bangkok) or the sales screen looks empty right after midnight
  const today = dayStart(nowMs)
  const stmts: D1PreparedStatement[] = [
    'DELETE FROM order_items',
    'DELETE FROM orders',
    'DELETE FROM calls',
    'DELETE FROM sessions',
    'DELETE FROM items',
    'DELETE FROM categories',
    "DELETE FROM sqlite_sequence WHERE name IN ('items', 'orders', 'order_items', 'sessions', 'calls')",
  ].map((q) => db.prepare(q))

  CATEGORIES.forEach(([id, name], i) => stmts.push(db.prepare('INSERT INTO categories (id, name, sort) VALUES (?, ?, ?)').bind(id, name, i)))
  ITEMS.forEach(([cat, name, desc, price, art, presets], i) =>
    stmts.push(
      db
        .prepare('INSERT INTO items (id, category_id, name, desc, price, art, presets, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(i + 1, cat, name, desc, price, art, JSON.stringify(presets), i),
    ),
  )
  TABLE_TOKENS.forEach((token, i) =>
    stmts.push(
      db
        .prepare('INSERT INTO tables (id, label, token) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET label = excluded.label, token = excluded.token')
        .bind(i + 1, String(i + 1), token),
    ),
  )

  let sid = 0
  let oid = 0
  for (const s of [...PAID.filter((p) => at(p.opened) >= today), ...OPEN]) {
    sid++
    let total = 0
    const orderStmts: D1PreparedStatement[] = []
    for (const o of s.orders) {
      oid++
      let sum = 0
      for (const [no, qty, picks = {}, note = ''] of o.lines) {
        const [, name, , price, , presets] = ITEMS[no - 1]
        const r = checkPicks({ name, price, options: presetGroups(presets) }, picks)
        if (!r.ok) throw new Error(`demo seed: ${r.error}`)
        sum += r.unit * qty
        orderStmts.push(
          db
            .prepare('INSERT INTO order_items (order_id, item_id, name, qty, unit_price, options, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(oid, no, name, qty, r.unit, r.text, note),
        )
      }
      total += sum
      orderStmts.unshift(
        db
          .prepare('INSERT INTO orders (id, session_id, table_id, status, total, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(oid, sid, s.table, o.status, sum, at(o.ago), at(Math.max(0, o.ago - 3))),
      )
    }
    stmts.push(
      db
        .prepare('INSERT INTO sessions (id, table_id, opened_at, closed_at, paid_total, bill_requested_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(sid, s.table, at(s.opened), s.closed === undefined ? null : at(s.closed), s.closed === undefined ? null : total, s.billAsked === undefined ? null : at(s.billAsked)),
      ...orderStmts,
    )
    for (const call of s.calls ?? [])
      stmts.push(db.prepare('INSERT INTO calls (table_id, kind, created_at) VALUES (?, ?, ?)').bind(s.table, call.kind, at(call.ago)))
  }
  stmts.push(
    db.prepare("INSERT INTO meta (key, value) VALUES ('reset', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(nowMs),
    db.prepare("INSERT INTO meta (key, value) VALUES ('touched', 0) ON CONFLICT(key) DO UPDATE SET value = 0"),
  )
  await db.batch(stmts)
}

const STALE_MS = 30 * 60_000
const IDLE_MS = 10 * 60_000

/**
 * Seed times are relative ("ordered 5 minutes ago"), so a demo seeded hours ago shows
 * absurd waiting times. Re-seed when the data is old AND nobody has used it recently,
 * so a visitor mid-demo is never wiped.
 */
export async function refreshIfStale(db: D1Database, nowMs = Date.now()): Promise<boolean> {
  const { results } = await db.prepare("SELECT key, value FROM meta WHERE key IN ('reset', 'touched')").all<{ key: string; value: number }>()
  const m = Object.fromEntries(results.map((r) => [r.key, r.value]))
  if (nowMs - (m.reset ?? 0) < STALE_MS || nowMs - (m.touched ?? 0) < IDLE_MS) return false
  await resetDemo(db, nowMs)
  return true
}

export const touch = (db: D1Database, nowMs = Date.now()) =>
  db.prepare("INSERT INTO meta (key, value) VALUES ('touched', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(nowMs).run()
