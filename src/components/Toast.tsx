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
    window.setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), tone === 'warn' ? 6000 : 3800)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`toast t-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
