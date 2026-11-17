import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api, send } from '../api'
import { Logo } from './Food'

type Session = { in: boolean; demo: boolean }

/** Gate for staff screens: shows the login form until the cookie session is valid. */
export function StaffGate({ title, children }: { title: string; children: (logout: () => void, demo: boolean) => ReactNode }) {
  const [s, setS] = useState<Session | null>(null)
  const check = useCallback(() => api<Session>('/staff/session').then(setS, () => setS({ in: false, demo: false })), [])
  useEffect(() => {
    check()
  }, [check])

  const logout = useCallback(async () => {
    await send('/staff/logout', 'POST').catch(() => {})
    setS((x) => (x ? { ...x, in: false } : x))
  }, [])

  if (!s) return <p className="loading">กำลังโหลด…</p>
  if (!s.in) return <Login title={title} demo={s.demo} onDone={check} />
  return <>{children(logout, s.demo)}</>
}

function Login({ title, demo, onDone }: { title: string; demo: boolean; onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await send('/staff/login', 'POST', { password: pw })
      onDone()
    } catch (er) {
      setError((er as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <Logo className="logo-lg" />
        <p className="eyebrow">สำหรับพนักงาน</p>
        <h1>{title}</h1>
        <label>
          <span>รหัสผ่านพนักงาน</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required autoFocus />
        </label>
        {error && (
          <p className="form-err" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy || !pw}>
          {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
        {demo && (
          <p className="login-demo">
            เดโม: รหัสผ่าน <code>demo1234</code>
          </p>
        )}
      </form>
    </div>
  )
}
