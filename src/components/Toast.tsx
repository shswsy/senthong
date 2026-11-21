import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tone = 'info' | 'ok' | 'warn'
type Toast = { id: number; text: string; tone: Tone }
type Push = (text: string, tone?: Tone) => void

const Ctx = createContext<Push>(() => {})

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([])
  const push = useCallback<Push>((text, tone = 'info') => {
    const id = ++seq
    setList((l) => [...l.slice(-2), { id, text, tone }])
    // a warning (failed order, lost connection) waits for the person to close it
    if (tone !== 'warn') window.setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3800)
  }, [])
  const close = (id: number) => setList((l) => l.filter((t) => t.id !== id))
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`toast t-${t.tone}`}>
            <span>{t.text}</span>
            {t.tone === 'warn' && (
              <button type="button" className="toast-x" onClick={() => close(t.id)} aria-label="ปิดข้อความ">
                ปิด
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
