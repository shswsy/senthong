// Stateless admin session: cookie = "<expiresMs>.<hmac>" signed with SESSION_SECRET.

const enc = new TextEncoder()
export const COOKIE = 'st_staff'
export const SESSION_MS = 12 * 3600_000

function b64url(buf: ArrayBuffer): string {
  let s = ''
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}

async function sha256(s: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', enc.encode(s))
}

/** constant-time string compare (hash first so lengths match) */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)])
  return crypto.subtle.timingSafeEqual(ha, hb)
}

export async function makeToken(secret: string, now = Date.now()): Promise<string> {
  const exp = String(now + SESSION_MS)
  return `${exp}.${await hmac(secret, exp)}`
}

export async function verifyToken(secret: string, token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false
  return safeEqual(sig, await hmac(secret, exp))
}
