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

  const admin = createAdminClient()
  const path = `${randomUUID()}.${ext}`
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: '31536000',
  })
  if (error) return { ok: false, error: 'upload_failed' }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  return { ok: true, url: data.publicUrl }
}
