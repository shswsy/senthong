import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'

export function usePath(): string {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const on = () => setPath(location.pathname)
    window.addEventListener('popstate', on)
    window.addEventListener('st:navigate', on)
    return () => {
      window.removeEventListener('popstate', on)
      window.removeEventListener('st:navigate', on)
    }
  }, [])
  return path
}

export function navigate(to: string) {
  if (to === location.pathname + location.search) return
  history.pushState(null, '', to)
  window.dispatchEvent(new Event('st:navigate'))
  window.scrollTo({ top: 0 })
}

export function Link({
  to,
  className,
  children,
  current,
}: {
  to: string
  className?: string
  children: ReactNode
  /** mark as current page when the path starts with `to` (default: exact match) */
  current?: 'exact' | 'prefix'
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(to)
  }
  const here = current === 'prefix' ? location.pathname.startsWith(to) : location.pathname === to
  return (
    <a href={to} className={className} onClick={onClick} aria-current={here ? 'page' : undefined}>
      {children}
    </a>
  )
}
