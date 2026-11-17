export class ApiError extends Error {
  status: number
  data: Record<string, unknown>
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch {
    throw new ApiError('เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ต', 0)
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new ApiError(typeof data.error === 'string' ? data.error : 'เกิดข้อผิดพลาด', res.status, data)
  return data as T
}

export const send = <T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) =>
  api<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })

/** sessionStorage that never throws (private mode, blocked storage) */
export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = sessionStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  },
  set(key: string, value: unknown) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  },
}
