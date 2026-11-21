import { useCallback, useEffect, useRef, useState } from 'react'
import { clock, type OrderStatus } from '../../shared/menu'
import type { KitchenResponse, OrderView } from '../../shared/types'
import { api, send } from '../api'
import { Logo } from '../components/Food'
import { Icon } from '../components/Icon'
import { StaffGate } from '../components/Staff'
import { useToast } from '../components/Toast'
import { ago, useLive, useNow } from '../live'
import { Link } from '../router'

type Col = { status: OrderStatus; title: string; next?: OrderStatus; action?: string; back?: OrderStatus }

const COLS: Col[] = [
  { status: 'new', title: 'ออเดอร์ใหม่', next: 'cooking', action: 'เริ่มทำ' },
  { status: 'cooking', title: 'กำลังทำ', next: 'ready', action: 'เสร็จ · พร้อมเสิร์ฟ', back: 'new' },
  { status: 'ready', title: 'พร้อมเสิร์ฟ', next: 'served', action: 'เสิร์ฟแล้ว', back: 'cooking' },
  { status: 'served', title: 'เพิ่งเสิร์ฟ', back: 'ready' },
]

/** how many just-served tickets this screen keeps around (for undo) */
const RECENT = 6

export default function Kitchen() {
  return <StaffGate title="จอครัว">{(logout) => <Board logout={logout} />}</StaffGate>
}

/** short two-tone chime, generated so there is no audio file to load */
function chime(ctx: AudioContext) {
  const t = ctx.currentTime
  for (const [f, at] of [
    [880, 0],
    [1320, 0.16],
  ]) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t + at)
    g.gain.exponentialRampToValueAtTime(0.3, t + at + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.35)
    o.connect(g).connect(ctx.destination)
    o.start(t + at)
    o.stop(t + at + 0.4)
  }
}

function Board({ logout }: { logout: () => void }) {
  const [data, setData] = useState<KitchenResponse | null>(null)
  const [skew, setSkew] = useState(0)
  const [fresh, setFresh] = useState<Set<number>>(new Set())
  const [confirm, setConfirm] = useState<number | null>(null)
  const [sound, setSound] = useState(false)
  // served orders drop out of the kitchen feed; keep the last few here so a mis-tap can be undone
  const [served, setServed] = useState<OrderView[]>([])
  // arrivals the cook has not had on screen yet; cleared when the ticket scrolls into view
  const [unseen, setUnseen] = useState<Set<number>>(new Set())
  const audio = useRef<AudioContext | null>(null)
  const seen = useRef<Set<number> | null>(null)
  const toast = useToast()
  const now = useNow(15_000) + skew

  const load = useCallback(async () => {
    try {
      const r = await api<KitchenResponse>('/staff/kitchen')
      setSkew(r.now - Date.now())
      setData(r)
      const ids = r.orders.map((o) => o.id)
      setServed((s) => s.filter((o) => !ids.includes(o.id)))
      if (seen.current) {
        const added = ids.filter((id) => !seen.current!.has(id))
        if (added.length) {
          setFresh((f) => new Set([...f, ...added]))
          setUnseen((u) => new Set([...u, ...added]))
          window.setTimeout(() => setFresh((f) => new Set([...f].filter((x) => !added.includes(x)))), 9000)
        }
      }
      seen.current = new Set([...(seen.current ?? []), ...ids])
      setUnseen((u) => (u.size && [...u].some((id) => !ids.includes(id)) ? new Set([...u].filter((id) => ids.includes(id))) : u))
    } catch {
      /* offline: keep last board, live hook retries */
    }
  }, [])

  const ding = () => {
    if (sound && audio.current) chime(audio.current)
  }

  const online = useLive(
    '',
    (e) => {
      load()
      if (e.type === 'orders' && e.fresh) {
        ding()
        toast(`ออเดอร์ใหม่ · โต๊ะ ${e.table}`, 'ok')
      }
      if (e.type === 'calls' && e.kind) {
        ding()
        toast(`โต๊ะ ${e.table} ${e.kind === 'bill' ? 'เรียกเช็คบิล' : 'เรียกพนักงาน'}`, 'warn')
      }
    },
    load,
  )

  useEffect(() => {
    load()
  }, [load])

  const toggleSound = () => {
    if (!audio.current) audio.current = new AudioContext()
    void audio.current.resume()
    setSound((s) => {
      if (!s) chime(audio.current!)
      return !s
    })
  }

  const markSeen = useCallback((id: number) => setUnseen((u) => (u.has(id) ? new Set([...u].filter((x) => x !== id)) : u)), [])

  const reveal = (id: number) => {
    const el = document.getElementById(`ticket-${id}`)
    if (!el) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' })
    el.focus({ preventScroll: true })
  }

  const move = async (o: OrderView, status: OrderStatus) => {
    setConfirm(null)
    markSeen(o.id)
    const moved = { ...o, status, updated_at: Date.now() }
    setData((d) => d && { ...d, orders: d.orders.map((x) => (x.id === o.id ? moved : x)).filter((x) => x.status !== 'served' && x.status !== 'cancelled') })
    if (status === 'served') setServed((s) => [moved, ...s.filter((x) => x.id !== o.id)].slice(0, RECENT))
    if (o.status === 'served') {
      setServed((s) => s.filter((x) => x.id !== o.id))
      setData((d) => d && { ...d, orders: [...d.orders, moved].sort((a, b) => a.created_at - b.created_at) })
    }
    try {
      await send(`/staff/orders/${o.id}`, 'PATCH', { status })
    } catch (e) {
      toast((e as Error).message, 'warn')
      if (status === 'served') setServed((s) => s.filter((x) => x.id !== o.id))
    }
    load()
  }

  const resolve = async (id: number) => {
    setData((d) => d && { ...d, calls: d.calls.filter((c) => c.id !== id) })
    await send(`/staff/calls/${id}/resolve`, 'POST').catch(() => {})
    load()
  }

  const orders = data?.orders ?? []
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length
  const oldest = orders.filter((o) => o.status !== 'ready').reduce((m, o) => Math.min(m, o.created_at), Infinity)
  const oldestMin = Number.isFinite(oldest) ? Math.floor((now - oldest) / 60_000) : null

  return (
    <div className="kitchen">
      <header className="k-top">
        <div className="k-brand">
          <Logo className="logo" />
          <div>
            <b>จอครัว</b>
            <span className={`live-pill ${online ? 'on' : ''}`}>{online ? 'เชื่อมต่อสด' : 'กำลังเชื่อมต่อ…'}</span>
          </div>
        </div>
        <dl className="k-stats" aria-label="สรุปตอนนี้">
          <div className="ks-new">
            <dt>ใหม่</dt>
            <dd>{count('new')}</dd>
          </div>
          <div className="ks-cooking">
            <dt>กำลังทำ</dt>
            <dd>{count('cooking')}</dd>
          </div>
          <div className="ks-ready">
            <dt>รอเสิร์ฟ</dt>
            <dd>{count('ready')}</dd>
          </div>
          <div className={`ks-wait ${oldestMin !== null && oldestMin >= 20 ? 'late' : oldestMin !== null && oldestMin >= 10 ? 'slow' : ''}`}>
            <dt>รอนานสุด</dt>
            <dd>{oldestMin === null ? '–' : `${oldestMin} น.`}</dd>
          </div>
        </dl>
        <div className="k-tools">
          <span className="k-clock">
            <Icon name="clock" size={18} />
            {clock(now)}
          </span>
          <button className={`btn btn-sm ${sound ? 'btn-gold' : 'btn-ghost'}`} onClick={toggleSound} aria-pressed={sound}>
            <Icon name={sound ? 'bell' : 'mute'} size={18} />
            {sound ? 'เสียงเปิด' : 'เปิดเสียง'}
          </button>
          <Link to="/admin" className="btn btn-sm btn-ghost">
            <Icon name="store" size={18} />
            หลังร้าน
          </Link>
          <button className="btn btn-sm btn-icon" onClick={logout} aria-label="ออกจากระบบ" title="ออกจากระบบ">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </header>

      {data && data.calls.length > 0 && (
        <div className="k-calls" aria-label="โต๊ะที่เรียก">
          {data.calls.map((c) => (
            <div key={c.id} className={`k-call ${c.kind}`}>
              <Icon name={c.kind === 'bill' ? 'receipt' : 'hand'} size={22} />
              <b>โต๊ะ {c.table_label}</b>
              <span>{c.kind === 'bill' ? 'เรียกเช็คบิล' : 'เรียกพนักงาน'}</span>
              <small>{ago(now, c.created_at)}</small>
              <button className="btn btn-sm" onClick={() => resolve(c.id)}>
                <Icon name="check" size={16} />
                รับทราบ
              </button>
            </div>
          ))}
        </div>
      )}

      {!data ? (
        <p className="loading">กำลังโหลดออเดอร์…</p>
      ) : (
        <div className="k-cols">
          {COLS.map((col) => {
            const list = col.status === 'served' ? served : orders.filter((o) => o.status === col.status)
            const hidden = list.filter((o) => unseen.has(o.id))
            return (
              <section key={col.status} className={`k-col c-${col.status}`} aria-labelledby={`kc-${col.status}`}>
                <h2 id={`kc-${col.status}`}>
                  <i aria-hidden="true" />
                  {col.title}
                  <span>{list.length}</span>
                </h2>
                <div className="k-list">
                  {list.length === 0 && (
                    <p className="k-empty">{col.status === 'served' ? 'ออเดอร์ที่เสิร์ฟจะอยู่ที่นี่ชั่วคราว กดย้อนได้ถ้ากดพลาด' : 'ไม่มีออเดอร์'}</p>
                  )}
                  {list.map((o) =>
                    col.status === 'served' ? (
                      <article key={o.id} className="k-card is-done">
                        <header>
                          <b className="k-table">
                            <small>โต๊ะ</small>
                            {o.table_label}
                          </b>
                          <span className="k-meta">
                            #{o.id} · {o.lines.reduce((s, l) => s + l.qty, 0)} รายการ
                          </span>
                          <button className="btn-undo" onClick={() => move(o, 'ready')}>
                            <Icon name="undo" size={16} />
                            ย้อน
                          </button>
                        </header>
                      </article>
                    ) : (
                      <Ticket
                        key={o.id}
                        o={o}
                        col={col}
                        now={now}
                        fresh={fresh.has(o.id)}
                        unseen={unseen.has(o.id)}
                        onSeen={markSeen}
                        confirming={confirm === o.id}
                        onMove={(s) => move(o, s)}
                        onConfirm={(on) => setConfirm(on ? o.id : null)}
                      />
                    ),
                  )}
                  {hidden.length > 0 && (
                    <button className="k-more" onClick={() => reveal(hidden[0].id)}>
                      +{hidden.length} ใหม่
                      <Icon name="down" size={18} />
                    </button>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Ticket({
  o,
  col,
  now,
  fresh,
  unseen,
  onSeen,
  confirming,
  onMove,
  onConfirm,
}: {
  o: OrderView
  col: Col
  now: number
  fresh: boolean
  unseen: boolean
  onSeen: (id: number) => void
  confirming: boolean
  onMove: (s: OrderStatus) => void
  onConfirm: (on: boolean) => void
}) {
  const wait = Math.floor((now - o.created_at) / 60_000)
  const box = useRef<HTMLElement>(null)
  // never scroll the board for the cook (that pushed the oldest ticket off screen);
  // just note when an arrival has actually been on screen so the "+N ใหม่" pill can drop it
  useEffect(() => {
    const el = box.current
    if (!unseen || !el) return
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && onSeen(o.id), { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [unseen, onSeen, o.id])
  return (
    <article ref={box} id={`ticket-${o.id}`} tabIndex={-1} aria-label={`โต๊ะ ${o.table_label} ออเดอร์ #${o.id}`} className={`k-card ${fresh ? 'is-fresh' : ''} ${wait >= 20 ? 'late' : wait >= 10 ? 'slow' : ''}`}>
      <header>
        <b className="k-table">
          <small>โต๊ะ</small>
          {o.table_label}
        </b>
        <span className="k-meta">
          {fresh && <em className="k-new">ใหม่</em>}#{o.id} · สั่ง {clock(o.created_at)}
        </span>
        <span className="k-wait">
          <Icon name="clock" size={15} />
          {ago(now, o.created_at)}
        </span>
      </header>
      <ul>
        {o.lines.map((l, i) => (
          <li key={i}>
            <span className="q">{l.qty}</span>
            <span>
              <b>{l.name}</b>
              {l.options && <small>{l.options}</small>}
              {l.note && (
                <em>
                  <Icon name="alert" size={15} />
                  {l.note}
                </em>
              )}
            </span>
          </li>
        ))}
      </ul>
      <footer>
        <div className="k-actions">
          {col.back && (
            <button className="btn-undo" onClick={() => onMove(col.back!)} aria-label="ย้อนสถานะ" title="ย้อนสถานะ">
              <Icon name="undo" size={18} />
            </button>
          )}
          <button className="btn btn-go btn-block" onClick={() => onMove(col.next!)}>
            {col.action}
            <Icon name="next" size={18} />
          </button>
        </div>
        {col.status === 'new' && (
          <div className="k-sub">
            {confirming ? (
              <>
                <button className="btn-text danger" onClick={() => onMove('cancelled')}>
                  ยืนยันยกเลิก
                </button>
                <button className="btn-text" onClick={() => onConfirm(false)}>
                  ไม่ยกเลิก
                </button>
              </>
            ) : (
              <button className="btn-text" onClick={() => onConfirm(true)}>
                ยกเลิกออเดอร์
              </button>
            )}
          </div>
        )}
      </footer>
    </article>
  )
}
