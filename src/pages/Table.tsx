import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  MAX_QTY,
  NOTE_MAX,
  SHOP,
  STATUS_LABEL,
  baht,
  checkPicks,
  clock,
  defaultPicks,
  type CartLine,
  type MenuItem,
  type OrderStatus,
  type Picks,
} from '../../shared/menu'
import type { MenuResponse, OrderView, TableState } from '../../shared/types'
import { ApiError, api, send, store } from '../api'
import { Food, Logo } from '../components/Food'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { useLive } from '../live'

type Line = CartLine & { uid: string }

const STEPS: OrderStatus[] = ['new', 'cooking', 'ready', 'served']

export default function Table({ token }: { token: string }) {
  const [menu, setMenu] = useState<MenuResponse | null>(null)
  const [state, setState] = useState<TableState | null>(null)
  const [fatal, setFatal] = useState('')
  const [view, setView] = useState<'menu' | 'orders'>('menu')
  const [cart, setCart] = useState<Line[]>(() => store.get(`st:cart:${token}`, []))
  const [picking, setPicking] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [cat, setCat] = useState<number | null>(null)
  const toast = useToast()
  const prev = useRef<Map<number, OrderStatus>>(new Map())
  const hadSession = useRef(false)

  useEffect(() => store.set(`st:cart:${token}`, cart), [cart, token])

  const loadMenu = useCallback(() => api<MenuResponse>('/menu').then(setMenu, () => {}), [])
  const loadState = useCallback(
    () =>
      api<TableState>(`/t/${token}`).then(setState, (e: ApiError) => {
        if (e.status === 404) setFatal(e.message)
      }),
    [token],
  )

  useEffect(() => {
    loadMenu()
    loadState()
  }, [loadMenu, loadState])

  // tell the customer when something of theirs changes
  useEffect(() => {
    if (!state) return
    const before = prev.current
    for (const o of state.orders) {
      const was = before.get(o.id)
      if (was && was !== o.status) {
        if (o.status === 'cooking') toast(`ออเดอร์ #${o.id} ครัวกำลังทำ`)
        if (o.status === 'ready') toast(`ออเดอร์ #${o.id} พร้อมเสิร์ฟแล้ว พนักงานกำลังนำไปที่โต๊ะ`, 'ok')
        if (o.status === 'cancelled') toast(`ออเดอร์ #${o.id} ถูกยกเลิก กรุณาสอบถามพนักงาน`, 'warn')
      }
    }
    prev.current = new Map(state.orders.map((o) => [o.id, o.status]))
    if (hadSession.current && !state.session) {
      toast('ชำระเงินเรียบร้อย ขอบคุณที่ใช้บริการครับ', 'ok')
      setView('menu')
    }
    hadSession.current = !!state.session
  }, [state, toast])

  const online = useLive(
    `t=${token}`,
    (e) => {
      if (e.type === 'menu') loadMenu()
      else loadState()
      if (e.type === 'tables') loadMenu()
    },
    () => {
      loadState()
      loadMenu()
    },
  )

  const items = useMemo(() => new Map((menu?.items ?? []).map((i) => [i.id, i])), [menu])

  const priced = cart.map((l) => {
    const item = items.get(l.item_id)
    const r = item ? checkPicks(item, l.picks) : null
    return { line: l, item, ok: !!item && item.available && !!r?.ok, unit: r?.ok ? r.unit : 0, text: r?.ok ? r.text : '' }
  })
  const cartQty = priced.reduce((s, p) => s + (p.ok ? p.line.qty : 0), 0)
  const cartTotal = priced.reduce((s, p) => s + (p.ok ? p.unit * p.line.qty : 0), 0)
  const blocked = priced.filter((p) => !p.ok)

  const add = (item: MenuItem, picks: Picks, qty: number, note: string) => {
    setCart((c) => {
      const same = c.find((l) => l.item_id === item.id && l.note === note && JSON.stringify(l.picks) === JSON.stringify(picks))
      if (same) return c.map((l) => (l === same ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
      return [...c, { uid: crypto.randomUUID(), item_id: item.id, picks, qty, note }]
    })
    setPicking(null)
    toast(`เพิ่ม ${item.name} ลงตะกร้าแล้ว`)
  }

  const setQty = (uid: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.uid !== uid) : c.map((l) => (l.uid === uid ? { ...l, qty: Math.min(MAX_QTY, qty) } : l))))

  const submit = async () => {
    if (sending || cartQty === 0 || blocked.length) return
    setSending(true)
    try {
      const next = await send<TableState>(`/t/${token}/orders`, 'POST', {
        lines: cart.map(({ item_id, qty, picks, note }) => ({ item_id, qty, picks, note })),
      })
      setState(next)
      setCart([])
      setCartOpen(false)
      setView('orders')
      window.scrollTo({ top: 0 })
      toast('ส่งออเดอร์แล้ว ครัวได้รับเรียบร้อย', 'ok')
    } catch (e) {
      toast((e as Error).message, 'warn')
      if (e instanceof ApiError && e.status === 409) loadMenu()
    } finally {
      setSending(false)
    }
  }

  const call = async (kind: 'waiter' | 'bill') => {
    try {
      setState(await send<TableState>(`/t/${token}/call`, 'POST', { kind }))
      toast(kind === 'bill' ? 'แจ้งเช็คบิลแล้ว พนักงานจะนำบิลมาที่โต๊ะ' : 'เรียกพนักงานแล้ว รอสักครู่นะครับ', 'ok')
    } catch (e) {
      toast((e as Error).message, 'warn')
    }
  }

  if (fatal)
    return (
      <div className="cust-empty wrap-narrow">
        <Logo className="logo-lg" />
        <h1>ไม่พบโต๊ะนี้</h1>
        <p>{fatal}</p>
      </div>
    )

  if (!menu || !state) return <p className="loading">กำลังโหลดเมนู…</p>

  const active = state.orders.filter((o) => o.status !== 'cancelled')
  const waiting = active.filter((o) => o.status !== 'served').length

  return (
    <div className="cust">
      <header className="cust-top">
        <div className="cust-brand">
          <Logo className="logo" />
          <div>
            <b>{SHOP.name}</b>
            <span>ก๋วยเตี๋ยว & อาหารตามสั่ง</span>
          </div>
        </div>
        <div className="table-badge" title={online ? 'เชื่อมต่อสด' : 'กำลังเชื่อมต่อ…'}>
          <small>โต๊ะ</small>
          <b>{state.table.label}</b>
          <i className={`live-dot ${online ? 'on' : ''}`} aria-hidden="true" />
        </div>
      </header>

      <nav className="seg" aria-label="สลับหน้า">
        <button aria-pressed={view === 'menu'} onClick={() => setView('menu')}>
          เมนู
        </button>
        <button aria-pressed={view === 'orders'} onClick={() => setView('orders')}>
          ออเดอร์ & บิล
          {waiting > 0 && <span className="count">{waiting}</span>}
        </button>
      </nav>

      {view === 'menu' ? (
        <MenuView menu={menu} cat={cat} setCat={setCat} onPick={setPicking} />
      ) : (
        <OrdersView state={state} onCall={call} onMenu={() => setView('menu')} />
      )}

      {cartQty > 0 && !cartOpen && (
        <button className="cart-bar" onClick={() => setCartOpen(true)}>
          <span className="cart-n">{cartQty}</span>
          <span>ดูตะกร้า · ยังไม่ได้ส่ง</span>
          <b>{baht(cartTotal)}</b>
        </button>
      )}

      {picking && (
        <ItemSheet item={items.get(picking.id) ?? picking} onClose={() => setPicking(null)} onAdd={add} />
      )}

      {cartOpen && (
        <Sheet title="ตะกร้าของโต๊ะ" onClose={() => setCartOpen(false)}>
          <ul className="cart-list">
            {priced.map(({ line, item, ok, unit, text }) => (
              <li key={line.uid} className={ok ? '' : 'is-out'}>
                {item && <Food art={item.art} className="cart-art" />}
                <div className="cart-info">
                  <b>{item?.name ?? 'เมนูนี้ถูกลบแล้ว'}</b>
                  {text && <span>{text}</span>}
                  {line.note && <em>“{line.note}”</em>}
                  {!ok && <strong className="tag-out">หมดแล้ว — ลบออกก่อนส่ง</strong>}
                </div>
                <div className="cart-side">
                  <Stepper value={line.qty} onChange={(q) => setQty(line.uid, q)} min={0} label={item?.name ?? ''} />
                  {ok && <b>{baht(unit * line.qty)}</b>}
                </div>
              </li>
            ))}
          </ul>
          <div className="sheet-foot">
            <div className="sum-row">
              <span>รวม {cartQty} รายการ</span>
              <b>{baht(cartTotal)}</b>
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={submit} disabled={sending || cartQty === 0 || blocked.length > 0}>
              {sending ? 'กำลังส่ง…' : 'ส่งออเดอร์ให้ครัว'}
            </button>
            <p className="hint">ชำระเงินที่เคาน์เตอร์หลังทานเสร็จ · สั่งเพิ่มได้ตลอด</p>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function MenuView({
  menu,
  cat,
  setCat,
  onPick,
}: {
  menu: MenuResponse
  cat: number | null
  setCat: (id: number) => void
  onPick: (i: MenuItem) => void
}) {
  const jump = (id: number) => {
    setCat(id)
    const el = document.getElementById(`cat-${id}`)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' })
  }
  return (
    <>
      <div className="chips" role="tablist" aria-label="หมวดเมนู">
        {menu.categories.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => jump(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="menu wrap-narrow">
        {menu.categories.map((c) => {
          const list = menu.items.filter((i) => i.category_id === c.id)
          if (!list.length) return null
          return (
            <section key={c.id} id={`cat-${c.id}`} className="menu-sec" aria-labelledby={`cat-h-${c.id}`}>
              <h2 id={`cat-h-${c.id}`}>{c.name}</h2>
              <div className="menu-grid">
                {list.map((i) => (
                  <button key={i.id} className={`dish ${i.available ? '' : 'is-out'}`} onClick={() => onPick(i)} disabled={!i.available}>
                    <Food art={i.art} className="dish-art" />
                    <span className="dish-body">
                      <b>{i.name}</b>
                      <span className="dish-desc">{i.desc}</span>
                      <span className="dish-foot">
                        <span className="price">{i.available ? baht(i.price) : 'หมดแล้ว'}</span>
                        {i.available && <span className="add" aria-hidden="true">+</span>}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
        <p className="menu-end">ราคารวม VAT แล้ว · แจ้งแพ้อาหารได้ในช่องหมายเหตุ</p>
      </div>
    </>
  )
}

function ItemSheet({
  item,
  onClose,
  onAdd,
}: {
  item: MenuItem
  onClose: () => void
  onAdd: (i: MenuItem, p: Picks, qty: number, note: string) => void
}) {
  const [picks, setPicks] = useState<Picks>(() => defaultPicks(item))
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const r = checkPicks(item, picks)

  const toggle = (gid: string, cid: string, one: boolean, required: boolean) =>
    setPicks((p) => {
      const cur = p[gid] ?? []
      if (one) return { ...p, [gid]: cur[0] === cid && !required ? [] : [cid] }
      return { ...p, [gid]: cur.includes(cid) ? cur.filter((x) => x !== cid) : [...cur, cid] }
    })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (r.ok && item.available) onAdd(item, picks, qty, note.trim())
  }

  return (
    <Sheet title={item.name} onClose={onClose} hero={<Food art={item.art} className="sheet-art" />}>
      <form onSubmit={submit} className="pick-form">
        <p className="sheet-desc">{item.desc}</p>
        {item.options.map((g) => (
          <fieldset key={g.id} className="opt">
            <legend>
              {g.name}
              <small>{g.required ? 'เลือก 1 อย่าง' : g.type === 'many' ? 'ไม่บังคับ · เลือกได้หลายอย่าง' : 'ไม่บังคับ'}</small>
            </legend>
            <div className="opt-row">
              {g.choices.map((ch) => {
                const on = (picks[g.id] ?? []).includes(ch.id)
                return (
                  <button
                    type="button"
                    key={ch.id}
                    className="pill"
                    role={g.type === 'one' ? 'radio' : 'checkbox'}
                    aria-checked={on}
                    onClick={() => toggle(g.id, ch.id, g.type === 'one', g.required)}
                  >
                    {ch.name}
                    {ch.price > 0 && <small>+{ch.price}</small>}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
        <label className="opt note">
          <span>
            หมายเหตุถึงครัว <small>ไม่บังคับ</small>
          </span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={NOTE_MAX} placeholder="เช่น ไม่ใส่ผักชี / แพ้กุ้ง" />
        </label>
        <div className="sheet-foot pick-foot">
          <Stepper value={qty} onChange={setQty} min={1} label={item.name} />
          <button className="btn btn-primary btn-lg" disabled={!r.ok || !item.available}>
            {!item.available ? 'หมดแล้ว' : r.ok ? `ใส่ตะกร้า · ${baht(r.unit * qty)}` : r.error.replace(`${item.name}: `, '')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

function Stepper({ value, onChange, min, label }: { value: number; onChange: (n: number) => void; min: number; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={`จำนวน ${label}`}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="ลดจำนวน">
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= MAX_QTY} aria-label="เพิ่มจำนวน">
        +
      </button>
    </div>
  )
}

function OrdersView({ state, onCall, onMenu }: { state: TableState; onCall: (k: 'waiter' | 'bill') => void; onMenu: () => void }) {
  const orders = [...state.orders].reverse()
  if (!state.session || orders.length === 0)
    return (
      <div className="cust-empty wrap-narrow">
        <Food art="soup" className="empty-art" />
        <h2>ยังไม่มีออเดอร์</h2>
        <p>เลือกเมนูแล้วกด “ส่งออเดอร์ให้ครัว” สถานะจะอัปเดตที่นี่แบบสด ๆ</p>
        <button className="btn btn-primary" onClick={onMenu}>
          ดูเมนู
        </button>
        <button className="btn btn-ghost" onClick={() => onCall('waiter')} disabled={state.calls.waiter}>
          {state.calls.waiter ? 'เรียกพนักงานแล้ว' : 'เรียกพนักงาน'}
        </button>
      </div>
    )
  return (
    <div className="orders wrap-narrow">
      {orders.map((o) => (
        <OrderCard key={o.id} o={o} />
      ))}
      <section className="bill" aria-label="บิลโต๊ะนี้">
        <div className="bill-head">
          <h2>บิลโต๊ะ {state.table.label}</h2>
          <span>เปิดโต๊ะ {clock(state.session.opened_at)} น.</span>
        </div>
        <div className="sum-row big">
          <span>ยอดรวม</span>
          <b>{baht(state.total)}</b>
        </div>
        <div className="bill-actions">
          <button className="btn btn-ghost" onClick={() => onCall('waiter')} disabled={state.calls.waiter}>
            {state.calls.waiter ? '✓ เรียกพนักงานแล้ว' : 'เรียกพนักงาน'}
          </button>
          <button className="btn btn-gold" onClick={() => onCall('bill')} disabled={state.calls.bill || !!state.session.bill_requested_at}>
            {state.calls.bill || state.session.bill_requested_at ? '✓ แจ้งเช็คบิลแล้ว' : 'เรียกเช็คบิล'}
          </button>
        </div>
        <p className="hint">ชำระเงินสด / โอน / บัตร ที่เคาน์เตอร์ หรือพนักงานนำบิลมาที่โต๊ะ</p>
      </section>
    </div>
  )
}

function OrderCard({ o }: { o: OrderView }) {
  const step = STEPS.indexOf(o.status)
  return (
    <article className={`ocard st-${o.status}`}>
      <header>
        <b>ออเดอร์ #{o.id}</b>
        <span>{clock(o.created_at)} น.</span>
        <span className={`status s-${o.status}`}>{STATUS_LABEL[o.status]}</span>
      </header>
      {o.status !== 'cancelled' && (
        <ol className="progress" aria-label={`สถานะ: ${STATUS_LABEL[o.status]}`}>
          {STEPS.map((s, i) => (
            <li key={s} className={i <= step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span>{['รับแล้ว', 'กำลังทำ', 'พร้อมเสิร์ฟ', 'เสิร์ฟแล้ว'][i]}</span>
            </li>
          ))}
        </ol>
      )}
      <ul className="olines">
        {o.lines.map((l, i) => (
          <li key={i}>
            <span className="q">{l.qty}×</span>
            <span className="n">
              {l.name}
              {l.options && <small>{l.options}</small>}
              {l.note && <em>“{l.note}”</em>}
            </span>
            <span className="p">{baht(l.unit_price * l.qty)}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}
