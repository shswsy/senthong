// Menu domain shared by the UI and the Worker. Prices are always recomputed on the server
// from these rules — the client total is only a preview.

export const SHOP = {
  name: 'เส้นทอง',
  full: 'เส้นทอง ก๋วยเตี๋ยว & อาหารตามสั่ง',
  area: 'ถ.นิมมานเหมินท์ เชียงใหม่',
  phone: '053-000-222',
  tables: 12,
}

export const MAX_QTY = 20
export const MAX_LINES = 30
export const NOTE_MAX = 80

export interface Choice {
  id: string
  name: string
  price: number
}

export interface OptionGroup {
  id: string
  name: string
  /** one = radio, many = checkboxes */
  type: 'one' | 'many'
  required: boolean
  choices: Choice[]
}

export type Art =
  | 'soup'
  | 'tomyum'
  | 'pink'
  | 'beef'
  | 'dry'
  | 'krapow'
  | 'friedrice'
  | 'padsew'
  | 'radna'
  | 'garlic'
  | 'balls'
  | 'wonton'
  | 'omelet'
  | 'porkfried'
  | 'thaitea'
  | 'greentea'
  | 'oliang'
  | 'water'
  | 'soda'
  | 'bualoy'
  | 'tubtim'

export interface Category {
  id: number
  name: string
  sort: number
}

export interface MenuItem {
  id: number
  category_id: number
  name: string
  desc: string
  price: number
  art: Art
  /** preset ids the owner picked; `options` is derived from them */
  presets: string[]
  options: OptionGroup[]
  available: boolean
  sort: number
}

/** groupId -> chosen choice ids */
export type Picks = Record<string, string[]>

export interface CartLine {
  item_id: number
  qty: number
  picks: Picks
  note: string
}

// ---------- option presets (owner picks from these in the menu editor) ----------

export const PRESETS: Record<string, OptionGroup> = {
  noodle: {
    id: 'noodle',
    name: 'เลือกเส้น',
    type: 'one',
    required: true,
    choices: [
      { id: 'small', name: 'เส้นเล็ก', price: 0 },
      { id: 'big', name: 'เส้นใหญ่', price: 0 },
      { id: 'mee', name: 'เส้นหมี่', price: 0 },
      { id: 'egg', name: 'บะหมี่', price: 0 },
      { id: 'glass', name: 'วุ้นเส้น', price: 0 },
    ],
  },
  soup: {
    id: 'soup',
    name: 'แบบ',
    type: 'one',
    required: true,
    choices: [
      { id: 'clear', name: 'น้ำใส', price: 0 },
      { id: 'dry', name: 'แห้ง', price: 0 },
    ],
  },
  size: {
    id: 'size',
    name: 'ขนาด',
    type: 'one',
    required: true,
    choices: [
      { id: 'normal', name: 'ธรรมดา', price: 0 },
      { id: 'special', name: 'พิเศษ', price: 10 },
    ],
  },
  meat: {
    id: 'meat',
    name: 'เลือกเนื้อสัตว์',
    type: 'one',
    required: true,
    choices: [
      { id: 'pork', name: 'หมูสับ', price: 0 },
      { id: 'chicken', name: 'ไก่', price: 0 },
      { id: 'crispy', name: 'หมูกรอบ', price: 10 },
      { id: 'shrimp', name: 'กุ้ง', price: 20 },
      { id: 'sea', name: 'ทะเล', price: 30 },
    ],
  },
  egg: {
    id: 'egg',
    name: 'เพิ่มไข่',
    type: 'many',
    required: false,
    choices: [
      { id: 'fried', name: 'ไข่ดาว', price: 10 },
      { id: 'omelet', name: 'ไข่เจียว', price: 10 },
    ],
  },
  spicy: {
    id: 'spicy',
    name: 'ความเผ็ด',
    type: 'one',
    required: false,
    choices: [
      { id: 'none', name: 'ไม่เผ็ด', price: 0 },
      { id: 'mild', name: 'เผ็ดน้อย', price: 0 },
      { id: 'hot', name: 'เผ็ดมาก', price: 0 },
    ],
  },
  sweet: {
    id: 'sweet',
    name: 'ความหวาน',
    type: 'one',
    required: false,
    choices: [
      { id: 'less', name: 'หวานน้อย', price: 0 },
      { id: 'normal', name: 'หวานปกติ', price: 0 },
      { id: 'more', name: 'หวานมาก', price: 0 },
    ],
  },
  drink: {
    id: 'drink',
    name: 'แบบ',
    type: 'one',
    required: true,
    choices: [
      { id: 'iced', name: 'เย็น', price: 0 },
      { id: 'frappe', name: 'ปั่น', price: 10 },
    ],
  },
}

export const PRESET_IDS = Object.keys(PRESETS)

export const presetGroups = (ids: string[]): OptionGroup[] =>
  ids.filter((id) => id in PRESETS).map((id) => PRESETS[id])

// ---------- pricing / validation ----------

export type LineCheck = { ok: true; unit: number; text: string } | { ok: false; error: string }

/** Validate a customer's picks against an item's option groups and price one unit. */
export function checkPicks(item: Pick<MenuItem, 'price' | 'options' | 'name'>, picks: Picks): LineCheck {
  let unit = item.price
  const parts: string[] = []
  for (const key of Object.keys(picks)) {
    if (!item.options.some((g) => g.id === key)) return { ok: false, error: `${item.name}: ตัวเลือกไม่ถูกต้อง` }
  }
  for (const g of item.options) {
    const raw = picks[g.id] ?? []
    if (!Array.isArray(raw)) return { ok: false, error: `${item.name}: ตัวเลือกไม่ถูกต้อง` }
    const ids = [...new Set(raw)]
    if (g.required && ids.length === 0) return { ok: false, error: `${item.name}: กรุณา${g.name}` }
    if (g.type === 'one' && ids.length > 1) return { ok: false, error: `${item.name}: ${g.name}ได้อย่างเดียว` }
    for (const id of ids) {
      const ch = g.choices.find((c) => c.id === id)
      if (!ch) return { ok: false, error: `${item.name}: ตัวเลือกไม่ถูกต้อง` }
      unit += ch.price
      parts.push(ch.name)
    }
  }
  return { ok: true, unit, text: parts.join(' · ') }
}

export const validQty = (q: unknown): q is number => Number.isInteger(q) && (q as number) >= 1 && (q as number) <= MAX_QTY

export const cleanNote = (s: unknown): string =>
  typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX) : ''

/** default picks: first choice of every required single-choice group */
export function defaultPicks(item: Pick<MenuItem, 'options'>): Picks {
  const p: Picks = {}
  for (const g of item.options) p[g.id] = g.required && g.type === 'one' ? [g.choices[0].id] : []
  return p
}

export const baht = (n: number) => `฿${n.toLocaleString('th-TH')}`

// ---------- orders ----------

export const ORDER_STATUSES = ['new', 'cooking', 'ready', 'served', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'ครัวได้รับแล้ว',
  cooking: 'กำลังทำ',
  ready: 'พร้อมเสิร์ฟ',
  served: 'เสิร์ฟแล้ว',
  cancelled: 'ยกเลิก',
}

/** allowed kitchen transitions */
export const NEXT: Record<OrderStatus, OrderStatus[]> = {
  new: ['cooking', 'cancelled'],
  cooking: ['ready', 'new'],
  ready: ['served', 'cooking'],
  served: ['ready'],
  cancelled: [],
}

// ---------- time (shop runs on Asia/Bangkok, UTC+7, no DST) ----------

const TZ_MS = 7 * 3600_000

/** epoch ms of 00:00 Bangkok on the day containing `ms` */
export const dayStart = (ms: number) => Math.floor((ms + TZ_MS) / 86_400_000) * 86_400_000 - TZ_MS

export const clock = (ms: number) => {
  const d = new Date(ms + TZ_MS)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}
