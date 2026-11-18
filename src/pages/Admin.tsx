import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { PRESETS, PRESET_IDS, baht, clock, type Art, type MenuItem } from '../../shared/menu'
import type { MenuResponse, QrTable, SalesResponse, TableState, TableSummary } from '../../shared/types'
import { api, send } from '../api'
import { ART_KEYS, Food, Logo } from '../components/Food'
import { Icon } from '../components/Icon'
import { Qr } from '../components/Qr'
import { StaffGate } from '../components/Staff'
import { useToast } from '../components/Toast'
import { ago, useLive, useNow } from '../live'
import { Link, navigate } from '../router'

const TABS = [
  { path: '/admin', label: 'โต๊ะ & บิล' },
  { path: '/admin/menu', label: 'จัดการเมนู' },
  { path: '/admin/qr', label: 'QR โต๊ะ' },
  { path: '/admin/sales', label: 'ยอดขายวันนี้' },
]

export default function Admin({ path }: { path: string }) {
  return <StaffGate title="หลังร้าน">{(logout, demo) => <Back path={path} logout={logout} demo={demo} />}</StaffGate>
}

function Back({ path, logout, demo }: { path: string; logout: () => void; demo: boolean }) {
  const [rev, setRev] = useState(0)
  const bump = useCallback(() => setRev((r) => r + 1), [])
  const toast = useToast()
  const online = useLive(
    '',
    (e) => {
      bump()
      if (e.type === 'calls' && e.kind) toast(`โต๊ะ ${e.table} ${e.kind === 'bill' ? 'เรียกเช็คบิล' : 'เรียกพนักงาน'}`, 'warn')
    },
    bump,
  )
  const tab = TABS.find((t) => t.path === path) ?? TABS[0]

  const reset = async () => {
    await send('/staff/reset-demo', 'POST').catch(() => {})
    toast('รีเซ็ตข้อมูลตัวอย่างแล้ว', 'ok')
    bump()
  }

  return (
    <div className="admin">
      <header className="a-top">
        <div className="a-brand">
          <Logo className="logo" />
          <div>
            <b>หลังร้าน</b>
            <span className={`live-pill ${online ? 'on' : ''}`}>{online ? 'อัปเดตสด' : 'กำลังเชื่อมต่อ…'}</span>
          </div>
        </div>
        <nav className="a-tabs" aria-label="เมนูหลังร้าน">
          {TABS.map((t) => (
            <Link key={t.path} to={t.path}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="a-tools">
          <Link to="/kitchen" className="btn btn-sm btn-ghost">
            จอครัว
          </Link>
          <button className="btn btn-sm btn-text" onClick={logout}>
            ออกจากระบบ
          </button>
        </div>
      </header>
      <main className="a-main">
        {tab.path === '/admin' && <TablesTab rev={rev} />}
        {tab.path === '/admin/menu' && <MenuTab rev={rev} />}
        {tab.path === '/admin/qr' && <QrTab />}
        {tab.path === '/admin/sales' && <SalesTab rev={rev} />}
        {demo && (
          <p className="a-demo">
            ข้อมูลตัวอย่างรีเซ็ตเองเมื่อไม่มีคนใช้ ·{' '}
            <button className="btn-text" onClick={reset}>
              รีเซ็ตตอนนี้
            </button>
          </p>
        )}
      </main>
    </div>
  )
}

// ---------- tables & bills ----------

function TablesTab({ rev }: { rev: number }) {
  const [tables, setTables] = useState<TableSummary[] | null>(null)
  const [sel, setSel] = useState<number | null>(null)
  const now = useNow()
  useEffect(() => {
    api<{ tables: TableSummary[] }>('/staff/tables').then((r) => setTables(r.tables), () => {})
  }, [rev])

  if (!tables) return <p className="loading">กำลังโหลด…</p>
  const busy = tables.filter((t) => t.session_id)
  const open = busy.reduce((s, t) => s + t.total, 0)

  return (
    <div className="split">
      <section>
        <div className="a-head">
          <h1>โต๊ะ & บิล</h1>
          <p>
            มีลูกค้า {busy.length}/{tables.length} โต๊ะ · ยอดที่ยังไม่ชำระ <b>{baht(open)}</b>
          </p>
        </div>
        <div className="tgrid">
          {tables.map((t) => {
            const st = !t.session_id ? 'free' : t.bill_requested_at ? 'bill' : 'busy'
            return (
              <button key={t.id} className={`tcell t-${st}`} onClick={() => setSel(t.id)} aria-pressed={sel === t.id}>
                <span className="tcell-n">{t.label}</span>
                {st === 'free' ? (
                  <span className="tcell-s">ว่าง</span>
                ) : (
                  <>
                    <b>{baht(t.total)}</b>
                    <span className="tcell-s">
                      {st === 'bill' ? 'ขอเช็คบิล' : t.pending ? `รออาหาร ${t.pending}` : 'ทานอยู่'} · {ago(now, t.opened_at!)}
                    </span>
                  </>
                )}
                {t.calls > 0 && st !== 'bill' && <span className="tcell-bell" title="เรียกพนักงาน"><Icon name="bell" size={18} /></span>}
              </button>
            )
          })}
        </div>
        <ul className="legend">
          <li className="t-free">ว่าง</li>
          <li className="t-busy">มีลูกค้า</li>
          <li className="t-bill">ขอเช็คบิล</li>
        </ul>
      </section>
      <aside className="panel" aria-live="polite">
        {sel ? <BillPanel key={sel} id={sel} rev={rev} onClosed={() => setSel(null)} /> : <p className="panel-empty">เลือกโต๊ะเพื่อดูบิลและปิดโต๊ะ</p>}
      </aside>
    </div>
  )
}

function BillPanel({ id, rev, onClosed }: { id: number; rev: number; onClosed: () => void }) {
  const [s, setS] = useState<TableState | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  useEffect(() => {
    api<TableState>(`/staff/tables/${id}`).then(setS, () => {})
  }, [id, rev])

  if (!s || s.table.id !== id) return <p className="loading">กำลังโหลด…</p>
  if (!s.session)
    return (
      <div className="panel-empty">
        <h2>โต๊ะ {s.table.label}</h2>
        <p>ว่าง — ยังไม่มีออเดอร์</p>
      </div>
    )

  // merge identical lines across orders for a readable bill
  const lines = new Map<string, { name: string; options: string; qty: number; price: number }>()
  for (const o of s.orders) {
    if (o.status === 'cancelled') continue
    for (const l of o.lines) {
      const k = `${l.name}|${l.options}|${l.unit_price}`
      const cur = lines.get(k)
      lines.set(k, { name: l.name, options: l.options, qty: (cur?.qty ?? 0) + l.qty, price: l.unit_price })
    }
  }
  const pending = s.orders.filter((o) => o.status === 'new' || o.status === 'cooking').length

  const close = async () => {
    setBusy(true)
    try {
      await send(`/staff/tables/${id}/close`, 'POST', { session_id: s.session!.id })
      toast(`ปิดโต๊ะ ${s.table.label} รับเงิน ${baht(s.total)} แล้ว`, 'ok')
      onClosed()
    } catch (e) {
      toast((e as Error).message, 'warn')
    } finally {
      setBusy(false)
      setConfirm(false)
    }
  }

  return (
    <div className="billp">
      <div className="billp-head">
        <h2>บิลโต๊ะ {s.table.label}</h2>
        <span>
          เปิด {clock(s.session.opened_at)} น. · {s.orders.length} ออเดอร์
        </span>
      </div>
      {(s.calls.bill || s.calls.waiter) && (
        <p className="billp-flag">{s.calls.bill ? 'ลูกค้าเรียกเช็คบิล' : 'ลูกค้าเรียกพนักงาน'}</p>
      )}
      <ul className="billp-lines">
        {[...lines.values()].map((l, i) => (
          <li key={i}>
            <span className="q">{l.qty}×</span>
            <span>
              {l.name}
              {l.options && <small>{l.options}</small>}
            </span>
            <b>{baht(l.qty * l.price)}</b>
          </li>
        ))}
      </ul>
      <div className="sum-row big">
        <span>ยอดชำระ</span>
        <b>{baht(s.total)}</b>
      </div>
      {pending > 0 && <p className="warn-note">ยังมี {pending} ออเดอร์ที่ครัวยังทำไม่เสร็จ</p>}
      {confirm ? (
        <div className="confirm">
          <p>
            ยืนยันรับเงิน <b>{baht(s.total)}</b> และปิดโต๊ะ {s.table.label}?
          </p>
          <button className="btn btn-primary btn-block" onClick={close} disabled={busy}>
            {busy ? 'กำลังปิดโต๊ะ…' : 'ยืนยัน ปิดโต๊ะ'}
          </button>
          <button className="btn btn-text btn-block" onClick={() => setConfirm(false)}>
            ยกเลิก
          </button>
        </div>
      ) : (
        <button className="btn btn-gold btn-block btn-lg" onClick={() => setConfirm(true)}>
          รับเงินแล้ว · ปิดโต๊ะ
        </button>
      )}
    </div>
  )
}

// ---------- menu editor ----------

type Draft = { id?: number; name: string; desc: string; price: string; category_id: number; art: Art; presets: string[] }

function MenuTab({ rev }: { rev: number }) {
  const [menu, setMenu] = useState<MenuResponse | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const toast = useToast()
  const load = useCallback(() => api<MenuResponse>('/staff/menu').then(setMenu, () => {}), [])
  useEffect(() => {
    load()
  }, [load, rev])

  const toggle = async (i: MenuItem) => {
    setMenu((m) => m && { ...m, items: m.items.map((x) => (x.id === i.id ? { ...x, available: !x.available } : x)) })
    try {
      await send(`/staff/items/${i.id}`, 'PATCH', { available: !i.available })
      toast(i.available ? `${i.name} — ตั้งเป็น “หมด” แล้ว ลูกค้าจะเห็นทันที` : `${i.name} — กลับมาขายแล้ว`, 'ok')
    } catch (e) {
      toast((e as Error).message, 'warn')
      load()
    }
  }

  if (!menu) return <p className="loading">กำลังโหลด…</p>
  const soldOut = menu.items.filter((i) => !i.available).length

  return (
    <div className="split">
      <section>
        <div className="a-head">
          <h1>จัดการเมนู</h1>
          <p>
            {menu.items.length} เมนู · หมด {soldOut} · กดสวิตช์เพื่อปิด/เปิดขาย ลูกค้าเห็นผลทันที
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setDraft({ name: '', desc: '', price: '', category_id: menu.categories[0]?.id ?? 1, art: 'soup', presets: [] })}
          >
            + เพิ่มเมนู
          </button>
        </div>
        {menu.categories.map((c) => (
          <div key={c.id} className="mgroup">
            <h2>{c.name}</h2>
            <ul className="mlist">
              {menu.items
                .filter((i) => i.category_id === c.id)
                .map((i) => (
                  <li key={i.id} className={i.available ? '' : 'is-out'}>
                    <Food art={i.art} className="m-art" />
                    <div className="m-info">
                      <b>{i.name}</b>
                      <span>
                        {baht(i.price)}
                        {i.presets.length > 0 && ` · ตัวเลือก: ${i.presets.map((p) => PRESETS[p].name).join(', ')}`}
                      </span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={i.available} onChange={() => toggle(i)} />
                      <span className="switch-ui" aria-hidden="true" />
                      <span className="switch-t">{i.available ? 'มีขาย' : 'หมด'}</span>
                      <span className="sr">เปิดขาย {i.name}</span>
                    </label>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setDraft({ id: i.id, name: i.name, desc: i.desc, price: String(i.price), category_id: i.category_id, art: i.art, presets: i.presets })}
                    >
                      แก้ไข
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
      <aside className="panel">
        {draft ? (
          <ItemForm
            key={draft.id ?? 'new'}
            draft={draft}
            categories={menu.categories}
            onDone={(msg) => {
              setDraft(null)
              if (msg) toast(msg, 'ok')
              load()
            }}
          />
        ) : (
          <p className="panel-empty">กด “แก้ไข” หรือ “+ เพิ่มเมนู” เพื่อแก้ชื่อ ราคา รูป และตัวเลือก</p>
        )}
      </aside>
    </div>
  )
}

function ItemForm({ draft, categories, onDone }: { draft: Draft; categories: MenuResponse['categories']; onDone: (msg?: string) => void }) {
  const [d, setD] = useState(draft)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [del, setDel] = useState(false)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const price = Number(d.price)
    if (!d.name.trim()) return setError('กรุณาใส่ชื่อเมนู')
    if (!Number.isInteger(price) || price < 0) return setError('ราคาต้องเป็นจำนวนเต็มบาท')
    setBusy(true)
    setError('')
    const body = { name: d.name, desc: d.desc, price, category_id: d.category_id, art: d.art, presets: d.presets }
    try {
      if (d.id) await send(`/staff/items/${d.id}`, 'PATCH', body)
      else await send('/staff/items', 'POST', body)
      onDone(d.id ? `บันทึก ${d.name} แล้ว` : `เพิ่ม ${d.name} แล้ว`)
    } catch (er) {
      setError((er as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    await send(`/staff/items/${d.id}`, 'DELETE').catch(() => {})
    onDone(`ลบ ${d.name} แล้ว`)
  }

  return (
    <form className="iform" onSubmit={submit}>
      <div className="iform-head">
        <Food art={d.art} className="iform-art" />
        <h2>{d.id ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h2>
      </div>
      <label>
        <span>ชื่อเมนู</span>
        <input value={d.name} onChange={(e) => set('name', e.target.value)} maxLength={60} required />
      </label>
      <label>
        <span>คำอธิบายสั้น ๆ</span>
        <input value={d.desc} onChange={(e) => set('desc', e.target.value)} maxLength={120} />
      </label>
      <div className="row2">
        <label>
          <span>ราคา (บาท)</span>
          <input value={d.price} onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))} inputMode="numeric" required />
        </label>
        <label>
          <span>หมวด</span>
          <select value={d.category_id} onChange={(e) => set('category_id', Number(e.target.value))}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>รูป</legend>
        <div className="art-pick">
          {ART_KEYS.map((a) => (
            <button type="button" key={a} aria-pressed={d.art === a} onClick={() => set('art', a)} aria-label={a}>
              <Food art={a} />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>ตัวเลือกให้ลูกค้าเลือก</legend>
        <div className="preset-pick">
          {PRESET_IDS.map((p) => (
            <label key={p} className="check">
              <input
                type="checkbox"
                checked={d.presets.includes(p)}
                onChange={(e) => set('presets', e.target.checked ? [...d.presets, p] : d.presets.filter((x) => x !== p))}
              />
              <span>
                <b>{PRESETS[p].name}</b>
                <small>{PRESETS[p].choices.map((c) => c.name + (c.price ? ` +${c.price}` : '')).join(' / ')}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}
      <div className="iform-actions">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
        <button type="button" className="btn btn-text" onClick={() => onDone()}>
          ยกเลิก
        </button>
        {d.id &&
          (del ? (
            <button type="button" className="btn btn-text danger" onClick={remove}>
              ยืนยันลบเมนูนี้
            </button>
          ) : (
            <button type="button" className="btn btn-text danger" onClick={() => setDel(true)}>
              ลบเมนู
            </button>
          ))}
      </div>
    </form>
  )
}

// ---------- QR codes ----------

function QrTab() {
  const [tables, setTables] = useState<QrTable[] | null>(null)
  useEffect(() => {
    api<{ tables: QrTable[] }>('/staff/qr').then((r) => setTables(r.tables), () => {})
  }, [])
  if (!tables) return <p className="loading">กำลังโหลด…</p>
  return (
    <section>
      <div className="a-head no-print">
        <h1>QR โต๊ะ</h1>
        <p>พิมพ์ติดโต๊ะ ลูกค้าสแกนแล้วสั่งอาหารได้ทันที แต่ละโต๊ะมีรหัสลับของตัวเอง สั่งแทนโต๊ะอื่นไม่ได้</p>
        <button className="btn btn-primary" onClick={() => window.print()}>
          พิมพ์ทั้งหมด
        </button>
      </div>
      <div className="qr-grid">
        {tables.map((t) => {
          const url = `${location.origin}/t/${t.token}`
          return (
            <figure key={t.id} className="qr-card">
              <div className="qr-brand">
                <Logo className="logo" />
                <b>เส้นทอง</b>
              </div>
              <Qr value={url} label={`QR โต๊ะ ${t.label}`} />
              <figcaption>
                <b>โต๊ะ {t.label}</b>
                <span>สแกนเพื่อดูเมนูและสั่งอาหาร</span>
                <a className="no-print" href={url} target="_blank" rel="noreferrer">
                  เปิดหน้าลูกค้า ↗
                </a>
              </figcaption>
            </figure>
          )
        })}
      </div>
    </section>
  )
}

// ---------- sales ----------

function SalesTab({ rev }: { rev: number }) {
  const [s, setS] = useState<SalesResponse | null>(null)
  useEffect(() => {
    api<SalesResponse>('/staff/sales').then(setS, () => {})
  }, [rev])
  if (!s) return <p className="loading">กำลังโหลด…</p>
  const maxTop = Math.max(1, ...s.top.map((t) => t.qty))
  const maxHour = Math.max(1, ...s.by_hour.map((h) => h.revenue))
  return (
    <section>
      <div className="a-head">
        <h1>ยอดขายวันนี้</h1>
        <p>นับจากบิลที่ปิดแล้วตั้งแต่ 00:00 น.</p>
      </div>
      <div className="stats">
        <div className="stat">
          <span>ยอดขาย (ปิดบิลแล้ว)</span>
          <b>{baht(s.revenue)}</b>
        </div>
        <div className="stat">
          <span>จำนวนบิล</span>
          <b>{s.bills}</b>
        </div>
        <div className="stat">
          <span>เฉลี่ยต่อบิล</span>
          <b>{baht(s.bills ? Math.round(s.revenue / s.bills) : 0)}</b>
        </div>
        <div className="stat">
          <span>ยังไม่ชำระ ({s.open_tables} โต๊ะ)</span>
          <b>{baht(s.open_total)}</b>
        </div>
      </div>
      <div className="charts">
        <div className="chart">
          <h2>เมนูขายดี</h2>
          {s.top.length === 0 && <p className="muted">ยังไม่มีข้อมูล</p>}
          <ol className="bars">
            {s.top.map((t) => (
              <li key={t.name}>
                <span className="bar-l">{t.name}</span>
                <span className="bar">
                  <i style={{ width: `${(t.qty / maxTop) * 100}%` }} />
                </span>
                <b>{t.qty} ที่</b>
              </li>
            ))}
          </ol>
        </div>
        <div className="chart">
          <h2>ยอดขายรายชั่วโมง</h2>
          {s.by_hour.length === 0 && <p className="muted">ยังไม่มีบิลที่ปิดวันนี้</p>}
          <ol className="bars">
            {s.by_hour.map((h) => (
              <li key={h.hour}>
                <span className="bar-l">{String(h.hour).padStart(2, '0')}:00</span>
                <span className="bar">
                  <i style={{ width: `${(h.revenue / maxHour) * 100}%` }} />
                </span>
                <b>{baht(h.revenue)}</b>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className="a-foot no-print">
        <button className="btn-text" onClick={() => navigate('/admin')}>
          ← กลับไปหน้าโต๊ะ & บิล
        </button>
      </p>
    </section>
  )
}
