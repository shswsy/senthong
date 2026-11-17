import { useCallback, useEffect, useRef, useState } from 'react'
import { clock, type OrderStatus } from '../../shared/menu'
import type { KitchenResponse, OrderView } from '../../shared/types'
import { api, send } from '../api'
import { Logo } from '../components/Food'
import { StaffGate } from '../components/Staff'
import { useToast } from '../components/Toast'
import { ago, useLive, useNow } from '../live'
import { Link } from '../router'

const COLS: { status: OrderStatus; title: string; next: OrderStatus; action: string; back?: OrderStatus }[] = [
  { status: 'new', title: 'ออเดอร์ใหม่', next: 'cooking', action: 'เริ่มทำ' },
  { status: 'cooking', title: 'กำลังทำ', next: 'ready', action: 'เสร็จ · พร้อมเสิร์ฟ', back: 'new' },
  { status: 'ready', title: 'พร้อมเสิร์ฟ', next: 'served', action: 'เสิร์ฟแล้ว', back: 'cooking' },
]

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
      if (seen.current) {
        const added = ids.filter((id) => !seen.current!.has(id))
        if (added.length) {
          setFresh((f) => new Set([...f, ...added]))
          window.setTimeout(() => setFresh((f) => new Set([...f].filter((x) => !added.includes(x)))), 9000)
        }
      }
      seen.current = new Set([...(seen.current ?? []), ...ids])
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

  const move = async (o: OrderView, status: OrderStatus) => {
    setConfirm(null)
    setData((d) => d && { ...d, orders: d.orders.map((x) => (x.id === o.id ? { ...x, status, updated_at: Date.now() } : x)).filter((x) => x.status !== 'served' && x.status !== 'cancelled') })
    try {
      await send(`/staff/orders/${o.id}`, 'PATCH', { status })
    } catch (e) {
      toast((e as Error).message, 'warn')
    }
    load()
  }

  const resolve = async (id: number) => {
    setData((d) => d && { ...d, calls: d.calls.filter((c) => c.id !== id) })
    await send(`/staff/calls/${id}/resolve`, 'POST').catch(() => {})
    load()
  }

  return (
    <div className="kitchen">
      <header className="k-top">
        <div className="k-brand">
          <Logo className="logo" />
          <b>จอครัว</b>
          <span className={`live-pill ${online ? 'on' : ''}`}>{online ? 'สด' : 'กำลังเชื่อมต่อ…'}</span>
        </div>
        <div className="k-tools">
          <span className="k-clock">{clock(now)}</span>
          <button className={`btn btn-sm ${sound ? 'btn-gold' : 'btn-dark'}`} onClick={toggleSound} aria-pressed={sound}>
            {sound ? '🔔 เสียงเปิด' : '🔕 เปิดเสียงแจ้งเตือน'}
          </button>
          <Link to="/admin" className="btn btn-sm btn-dark">
            หลังร้าน
          </Link>
          <button className="btn btn-sm btn-link-light" onClick={logout}>
            ออก
          </button>
        </div>
      </header>

      {data && data.calls.length > 0 && (
        <div className="k-calls" aria-label="โต๊ะที่เรียก">
          {data.calls.map((c) => (
            <div key={c.id} className={`k-call ${c.kind}`}>
              <b>โต๊ะ {c.table_label}</b>
              <span>{c.kind === 'bill' ? 'เรียกเช็คบิล' : 'เรียกพนักงาน'}</span>
              <small>{ago(now, c.created_at)}</small>
              <button className="btn btn-sm" onClick={() => resolve(c.id)}>
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
            const list = data.orders.filter((o) => o.status === col.status)
            return (
              <section key={col.status} className={`k-col c-${col.status}`} aria-labelledby={`kc-${col.status}`}>
                <h2 id={`kc-${col.status}`}>
                  {col.title} <span>{list.length}</span>
                </h2>
                {list.length === 0 && <p className="k-empty">ไม่มีออเดอร์</p>}
                {list.map((o) => {
                  const wait = Math.floor((now - o.created_at) / 60_000)
                  return (
                    <article key={o.id} className={`k-card ${fresh.has(o.id) ? 'is-fresh' : ''} ${wait >= 20 ? 'late' : wait >= 10 ? 'slow' : ''}`}>
                      <header>
                        <b className="k-table">โต๊ะ {o.table_label}</b>
                        <span className="k-meta">
                          #{o.id} · {clock(o.created_at)}
                        </span>
                        <span className="k-wait">{ago(now, o.created_at)}</span>
                      </header>
                      <ul>
                        {o.lines.map((l, i) => (
                          <li key={i}>
                            <span className="q">{l.qty}</span>
                            <span>
                              <b>{l.name}</b>
                              {l.options && <small>{l.options}</small>}
                              {l.note && <em>⚠ {l.note}</em>}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <footer>
                        <button className="btn btn-primary btn-block" onClick={() => move(o, col.next)}>
                          {col.action}
                        </button>
                        <div className="k-sub">
                          {col.back && (
                            <button className="btn-text" onClick={() => move(o, col.back!)}>
                              ← ย้อนสถานะ
                            </button>
                          )}
                          {col.status === 'new' &&
                            (confirm === o.id ? (
                              <>
                                <button className="btn-text danger" onClick={() => move(o, 'cancelled')}>
                                  ยืนยันยกเลิก
                                </button>
                                <button className="btn-text" onClick={() => setConfirm(null)}>
                                  ไม่ยกเลิก
                                </button>
                              </>
                            ) : (
                              <button className="btn-text" onClick={() => setConfirm(o.id)}>
                                ยกเลิกออเดอร์
                              </button>
                            ))}
                        </div>
                      </footer>
                    </article>
                  )
                })}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
