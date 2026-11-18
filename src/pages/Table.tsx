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
import { Icon } from '../components/Icon'
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
  const inCart = new Map<number, number>()
  for (const p of priced) if (p.ok) inCart.set(p.line.item_id, (inCart.get(p.line.item_id) ?? 0) + p.line.qty)
  const goOrders = () => {
    setView('orders')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="cust">
      <header className="cust-top">
        <div className="cust-top-in wrap-menu">
          <div className="cust-brand">
            <Logo className="logo" />
            <div>
              <b>{SHOP.name}</b>
              <span>ก๋วยเตี๋ยว & อาหารตามสั่ง</span>
            </div>
          </div>
          <div className="table-badge" title={online ? 'เชื่อมต่อสด' : 'กำลังเชื่อมต่อ…'}>
            <i className={`live-dot ${online ? 'on' : ''}`} aria-hidden="true" />
            <small>โต๊ะ</small>
            <b>{state.table.label}</b>
          </div>
        </div>
        <div className="wrap-menu">
          <nav className="seg" aria-label="สลับหน้า">
            <button aria-pressed={view === 'menu'} onClick={() => setView('menu')}>
              เมนู
            </button>
            <button aria-pressed={view === 'orders'} onClick={goOrders}>
              ออเดอร์ & บิล
              {waiting > 0 && <span className="count">{waiting}</span>}
            </button>
          </nav>
        </div>
      </header>

      {view === 'menu' ? (
        <MenuView
          menu={menu}
          cat={cat}
          setCat={setCat}
          inCart={inCart}
          table={state.table.label}
          onAdd={(i) => (i.options.length ? setPicking(i) : add(i, defaultPicks(i), 1, ''))}
          onOpen={setPicking}
        />
      ) : (
        <OrdersView state={state} onCall={call} onMenu={() => setView('menu')} />
      )}

      {cartQty > 0 && !cartOpen ? (
        <div className="float-bar">
          <button className="cart-bar" onClick={() => setCartOpen(true)}>
            <span className="cart-ico">
              <Icon name="bag" size={22} />
              <span className="cart-n">{cartQty}</span>
            </span>
            <span className="cart-t">
              <b>ดูตะกร้า</b>
              <small>ยังไม่ได้ส่งให้ครัว</small>
            </span>
            <b className="cart-sum">{baht(cartTotal)}</b>
          </button>
        </div>
      ) : (
        view === 'menu' &&
        waiting > 0 && (
          <div className="float-bar">
            <button className="track-bar" onClick={goOrders}>
              <Icon name="flame" size={20} />
              <span>
                ติดตามออเดอร์ · <b>{waiting}</b> ออเดอร์กำลังมา
              </span>
              <Icon name="next" size={18} />
            </button>
          </div>
        )
      )}

      {picking && <ItemSheet item={items.get(picking.id) ?? picking} onClose={() => setPicking(null)} onAdd={add} />}

      {cartOpen && (
        <Sheet title="ตะกร้าของโต๊ะ" onClose={() => setCartOpen(false)}>
          <ul className="cart-list">
            {priced.map(({ line, item, ok, unit, text }) => (
              <li key={line.uid} className={ok ? '' : 'is-out'}>
                {item && (
                  <span className="cart-art">
                    <Food art={item.art} />
                  </span>
                )}
                <div className="cart-info">
                  <b>{item?.name ?? 'เมนูนี้ถูกลบแล้ว'}</b>
                  {text && <span>{text}</span>}
                  {line.note && <em>“{line.note}”</em>}
                  {!ok && <strong className="tag-out">หมดแล้ว — ลบออกก่อนส่ง</strong>}
                </div>
                <div className="cart-side">
                  {ok && <b>{baht(unit * line.qty)}</b>}
                  <Stepper value={line.qty} onChange={(q) => setQty(line.uid, q)} min={0} label={item?.name ?? ''} />
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
  inCart,
  table,
  onAdd,
  onOpen,
}: {
  menu: MenuResponse
  cat: number | null
  setCat: (id: number) => void
  inCart: Map<number, number>
  table: string
  onAdd: (i: MenuItem) => void
  onOpen: (i: MenuItem) => void
}) {
  const chips = useRef<HTMLDivElement>(null)
  const lock = useRef(0)
  const cats = menu.categories.filter((c) => menu.items.some((i) => i.category_id === c.id))
  const current = cat ?? cats[0]?.id ?? null

  // scroll-spy: highlight the category whose heading has passed under the sticky chips
  useEffect(() => {
    const onScroll = () => {
      if (Date.now() < lock.current) return
      let id: number | null = cats[0]?.id ?? null
      for (const c of cats) {
        const el = document.getElementById(`cat-${c.id}`)
        if (el && el.getBoundingClientRect().top < 140) id = c.id
      }
      if (id !== null && id !== current) setCat(id)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  })

  // keep the active chip visible inside the horizontal strip
  useEffect(() => {
    const box = chips.current
    const el = box?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (box && el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' })
  }, [current])

  const jump = (id: number) => {
    setCat(id)
    lock.current = Date.now() + 900
    const el = document.getElementById(`cat-${id}`)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' })
  }

  return (
    <>
      <section className="promo wrap-menu" aria-label="วิธีสั่ง">
        <div className="promo-copy">
          <p className="promo-kicker">โต๊ะ {table} · สั่งเองได้เลย</p>
          <h1>
            เส้นนุ่ม น้ำซุปเข้ม <em>ส่งตรงถึงครัว</em>
          </h1>
          <ol className="promo-steps">
            <li>แตะเมนู</li>
            <li>ส่งให้ครัว</li>
            <li>จ่ายที่เคาน์เตอร์</li>
          </ol>
        </div>
        <Food art="soup" className="promo-art" />
      </section>

      <div className="chips-bar">
        <div className="chips wrap-menu" role="tablist" aria-label="หมวดเมนู" ref={chips}>
          {cats.map((c) => (
            <button key={c.id} role="tab" aria-selected={current === c.id} onClick={() => jump(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="menu wrap-menu">
        {cats.map((c) => {
          const list = menu.items.filter((i) => i.category_id === c.id)
          return (
            <section key={c.id} id={`cat-${c.id}`} className="menu-sec" aria-labelledby={`cat-h-${c.id}`}>
              <h2 id={`cat-h-${c.id}`}>
                {c.name} <span>{list.length} รายการ</span>
              </h2>
              <div className="menu-grid">
                {list.map((i) => {
                  const n = inCart.get(i.id) ?? 0
                  return (
                    <article key={i.id} className={`dish ${i.available ? '' : 'is-out'} ${n ? 'in-cart' : ''}`}>
                      <button className="dish-open" onClick={() => onOpen(i)} disabled={!i.available}>
                        <span className={`dish-art tone-${c.id % 5}`}>
                          <Food art={i.art} />
                          {!i.available && <span className="dish-flag">หมดแล้ว</span>}
                        </span>
                        <span className="dish-body">
                          <b>{i.name}</b>
                          <span className="dish-desc">{i.desc}</span>
                          <span className="price">{baht(i.price)}</span>
                        </span>
                      </button>
                      {i.available && (
                        <button
                          className="add"
                          onClick={() => onAdd(i)}
                          data-quick={i.options.length ? undefined : ''}
                          aria-label={i.options.length ? `เลือกตัวเลือก ${i.name}` : `เพิ่ม ${i.name} ลงตะกร้า`}
                        >
                          {n > 0 && <span className="add-n">{n}</span>}
                          <Icon name="plus" size={20} />
                        </button>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
        <p className="menu-end">ราคารวม VAT แล้ว · แจ้งแพ้อาหารได้ในช่องหมายเหตุ</p>
        <footer className="cust-foot">
          <b>{SHOP.full}</b>
          <span>ร้านนี้เป็นธุรกิจสมมติ สร้างเป็นผลงานตัวอย่างระบบสั่งอาหารผ่าน QR</span>
        </footer>
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
    <Sheet
      title={item.name}
      onClose={onClose}
      hero={
        <>
          <Food art={item.art} className="sheet-art" />
          <span className="sheet-price">{baht(item.price)}</span>
        </>
      }
    >
      <form onSubmit={submit} className="pick-form">
        <p className="sheet-desc">{item.desc}</p>
        {item.options.map((g) => (
          <fieldset key={g.id} className="opt">
            <legend>
              {g.name}
              <small className={g.required ? 'req' : ''}>
                {g.required ? 'ต้องเลือก 1' : g.type === 'many' ? 'ไม่บังคับ · เลือกได้หลายอย่าง' : 'ไม่บังคับ'}
              </small>
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
                    {on && <Icon name="check" size={16} />}
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
            {!item.available ? (
              'หมดแล้ว'
            ) : r.ok ? (
              <>
                <span>ใส่ตะกร้า</span>
                <b className="btn-price">{baht(r.unit * qty)}</b>
              </>
            ) : (
              r.error.replace(`${item.name}: `, '')
            )}
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
        <Icon name="minus" size={18} />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= MAX_QTY} aria-label="เพิ่มจำนวน">
        <Icon name="plus" size={18} />
      </button>
    </div>
  )
}

function OrdersView({ state, onCall, onMenu }: { state: TableState; onCall: (k: 'waiter' | 'bill') => void; onMenu: () => void }) {
  const orders = [...state.orders].reverse()
  if (!state.session || orders.length === 0)
    return (
      <div className="cust-empty wrap-narrow">
        <span className="empty-art">
          <Food art="soup" />
        </span>
        <h2>ยังไม่มีออเดอร์</h2>
        <p>เลือกเมนูแล้วกด “ส่งออเดอร์ให้ครัว” สถานะจะอัปเดตที่นี่แบบสด ๆ</p>
        <button className="btn btn-primary btn-lg" onClick={onMenu}>
          ดูเมนู
        </button>
        <button className="btn btn-ghost" onClick={() => onCall('waiter')} disabled={state.calls.waiter}>
          <Icon name={state.calls.waiter ? 'check' : 'hand'} size={18} />
          {state.calls.waiter ? 'เรียกพนักงานแล้ว' : 'เรียกพนักงาน'}
        </button>
      </div>
    )
  const billAsked = state.calls.bill || !!state.session.bill_requested_at
  return (
    <div className="orders wrap-menu">
      <div className="orders-list">
        {orders.map((o) => (
          <OrderCard key={o.id} o={o} />
        ))}
      </div>
      <aside className="bill" aria-label="บิลโต๊ะนี้">
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
            <Icon name={state.calls.waiter ? 'check' : 'hand'} size={18} />
            {state.calls.waiter ? 'เรียกแล้ว' : 'เรียกพนักงาน'}
          </button>
          <button className="btn btn-gold" onClick={() => onCall('bill')} disabled={billAsked}>
            <Icon name={billAsked ? 'check' : 'receipt'} size={18} />
            {billAsked ? 'แจ้งเช็คบิลแล้ว' : 'เรียกเช็คบิล'}
          </button>
        </div>
        <button className="btn btn-primary btn-block" onClick={onMenu}>
          <Icon name="plus" size={18} />
          สั่งเพิ่ม
        </button>
        <p className="hint">ชำระเงินสด / โอน / บัตร ที่เคาน์เตอร์ หรือพนักงานนำบิลมาที่โต๊ะ</p>
      </aside>
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
      <footer className="ocard-foot">
        <span>รวม</span>
        <b>{baht(o.total)}</b>
      </footer>
    </article>
  )
}
