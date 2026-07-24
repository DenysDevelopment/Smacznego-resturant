'use client'
import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { uploadDishPhoto, importImageFromUrl } from '@/lib/menu/admin/upload'

const UPLOAD_ERRORS: Record<string, string> = {
  unauthorized: 'Нет доступа',
  no_file: 'Файл не выбран',
  too_large: 'Файл больше 4 МБ',
  bad_type: 'Только WEBP, JPEG или PNG',
  upload_failed: 'Не удалось загрузить',
  bad_url: 'Некорректная ссылка',
  fetch_failed: 'Не удалось скачать по ссылке',
}

/** External http(s) link that isn't already in our own storage bucket. */
function isExternalUrl(v: string): boolean {
  return /^https?:\/\//i.test(v) && !v.includes('/storage/v1/object/public/')
}

export function PhotoField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [zoomed, setZoomed] = useState(false)

  const inputCls = 'w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-beet'

  function pickFile(file: File | undefined) {
    if (!file) return
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    start(async () => {
      const res = await uploadDishPhoto(formData)
      if (!res.ok) {
        setError(UPLOAD_ERRORS[res.error] ?? 'Ошибка загрузки')
        return
      }
      onChange(res.url)
    })
  }

  function importFromUrl() {
    setError('')
    start(async () => {
      const res = await importImageFromUrl(value)
      if (!res.ok) {
        setError(UPLOAD_ERRORS[res.error] ?? 'Ошибка загрузки')
        return
      }
      onChange(res.url)
    })
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Фото</span>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => value && setZoomed(true)}
          title={value ? 'Открыть крупнее' : undefined}
          className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-panel ${
            value ? 'cursor-zoom-in transition-transform hover:scale-[1.03]' : 'cursor-default'
          }`}
        >
          {value ? (
            <Image src={value} alt="" fill sizes="5rem" className="object-cover" unoptimized={value.startsWith('http')} />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-muted">нет</span>
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/dishes/dish-01.webp или URL"
            className={inputCls}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/webp,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-line px-4 py-1.5 text-xs font-bold text-ink/70 hover:bg-ink hover:text-paper disabled:opacity-50"
            >
              {pending ? 'Загружаем…' : 'Загрузить файл'}
            </button>
            {isExternalUrl(value) && (
              <button
                type="button"
                disabled={pending}
                onClick={importFromUrl}
                title="Скачать картинку по ссылке на наш сервер (без внешних хостов)"
                className="rounded-full border border-beet/40 bg-beet/10 px-4 py-1.5 text-xs font-bold text-beet hover:bg-beet hover:text-paper disabled:opacity-50"
              >
                {pending ? 'Скачиваем…' : 'Скачать на сервер'}
              </button>
            )}
          </div>
          {isExternalUrl(value) && !error && (
            <p className="text-xs text-muted">Внешняя ссылка. Нажмите «Скачать на сервер», чтобы не зависеть от чужого хоста.</p>
          )}
          {error && <p className="text-xs font-semibold text-brick">{error}</p>}
        </div>
      </div>

      {zoomed && value && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-ink/70 p-6"
          onClick={() => setZoomed(false)}
        >
          <div className="relative h-[70vh] w-full max-w-2xl">
            <Image
              src={value}
              alt=""
              fill
              sizes="42rem"
              className="rounded-2xl object-contain drop-shadow-2xl"
              unoptimized={value.startsWith('http')}
            />
          </div>
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute right-5 top-5 rounded-full bg-paper px-4 py-2 text-sm font-bold text-ink shadow-lg"
          >
            Закрыть
          </button>
        </div>
      )}
    </div>
  )
}
