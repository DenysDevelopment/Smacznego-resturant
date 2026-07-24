'use server'
import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/auth/require'

const MAX_BYTES = 4 * 1024 * 1024
const BUCKET = 'dishes'

const EXT_BY_MIME: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

/** Cheap magic-byte check so a renamed .exe can't pass as an image. */
function sniffImage(bytes: Uint8Array, mime: string): boolean {
  if (bytes.length < 12) return false
  switch (mime) {
    case 'image/webp': // RIFF....WEBP
      return (
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
      )
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    case 'image/png':
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    default:
      return false
  }
}

/** Store validated image bytes in our own bucket and return the public URL. */
async function storeImage(bytes: Uint8Array, mime: string): Promise<string | null> {
  const admin = createAdminClient()
  const path = `${randomUUID()}.${EXT_BY_MIME[mime]}`
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: mime,
    cacheControl: '31536000',
  })
  if (error) return null
  return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function uploadDishPhoto(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: 'unauthorized' | 'no_file' | 'too_large' | 'bad_type' | 'upload_failed' }> {
  if (!(await hasRole('staff'))) return { ok: false, error: 'unauthorized' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'no_file' }
  if (file.size > MAX_BYTES) return { ok: false, error: 'too_large' }
  const ext = EXT_BY_MIME[file.type]
  if (!ext) return { ok: false, error: 'bad_type' }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!sniffImage(bytes, file.type)) return { ok: false, error: 'bad_type' }

  const url = await storeImage(bytes, file.type)
  if (!url) return { ok: false, error: 'upload_failed' }
  return { ok: true, url }
}

/** Reject URLs that resolve to the loopback / link-local / private ranges by
 *  hostname. Defense-in-depth for a staff-only fetch — not a full SSRF guard. */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase()
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1' || h.endsWith('.localhost')) return true
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  return false
}

/**
 * Fetch an image from an external URL server-side and store it in our own
 * bucket, so the storefront never depends on a third-party host (and prod CSP
 * only needs to allow our Supabase host). Staff-only.
 */
export async function importImageFromUrl(
  rawUrl: string,
): Promise<{ ok: true; url: string } | { ok: false; error: 'unauthorized' | 'bad_url' | 'fetch_failed' | 'too_large' | 'bad_type' | 'upload_failed' }> {
  if (!(await hasRole('staff'))) return { ok: false, error: 'unauthorized' }

  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return { ok: false, error: 'bad_url' }
  }
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || isBlockedHost(parsed.hostname)) {
    return { ok: false, error: 'bad_url' }
  }

  let res: Response
  try {
    res = await fetch(parsed, { redirect: 'follow', signal: AbortSignal.timeout(10_000) })
  } catch {
    return { ok: false, error: 'fetch_failed' }
  }
  if (!res.ok) return { ok: false, error: 'fetch_failed' }

  const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  if (!EXT_BY_MIME[mime]) return { ok: false, error: 'bad_type' }
  const declaredLen = Number(res.headers.get('content-length'))
  if (Number.isFinite(declaredLen) && declaredLen > MAX_BYTES) return { ok: false, error: 'too_large' }

  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.length > MAX_BYTES) return { ok: false, error: 'too_large' }
  if (!sniffImage(bytes, mime)) return { ok: false, error: 'bad_type' }

  const url = await storeImage(bytes, mime)
  if (!url) return { ok: false, error: 'upload_failed' }
  return { ok: true, url }
}
