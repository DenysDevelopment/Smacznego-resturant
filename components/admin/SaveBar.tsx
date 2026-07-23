'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { I18nText } from '@/lib/menu/admin/validate'

export type SaveResult = { ok: true } | { ok: false; error: string }
interface Entry { isDirty: boolean; save: () => Promise<SaveResult> }

const SaveContext = createContext<{ register: (id: string, entry: Entry) => () => void } | null>(null)

/** Locale-wise equality treating missing and empty string as the same. */
export function eqI18n(a: I18nText, b: I18nText): boolean {
  return (['pl', 'uk', 'ru'] as const).every((k) => (a[k] ?? '').trim() === (b[k] ?? '').trim())
}

/**
 * Single bottom-center save button for all admin forms. Forms register their
 * dirty flag + save callback via useSaveRegistration; the bar is gray when
 * nothing is dirty and beet when there are unsaved changes. Internal
 * navigation while dirty opens a save/discard dialog.
 */
export function AdminSaveProvider({ children }: { children: React.ReactNode }) {
  const entriesRef = useRef(new Map<string, Entry>())
  const [{ hasForms, dirty }, setStatus] = useState({ hasForms: false, dirty: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const router = useRouter()

  const register = useCallback((id: string, entry: Entry) => {
    const entries = entriesRef.current
    const recompute = () => {
      const next = { hasForms: entries.size > 0, dirty: [...entries.values()].some((e) => e.isDirty) }
      setStatus((prev) =>
        prev.hasForms === next.hasForms && prev.dirty === next.dirty ? prev : next,
      )
    }
    entries.set(id, entry)
    recompute()
    return () => {
      entries.delete(id)
      recompute()
    }
  }, [])

  const ctxValue = useMemo(() => ({ register }), [register])

  const saveAll = useCallback(async (): Promise<boolean> => {
    setSaving(true)
    setError('')
    for (const entry of [...entriesRef.current.values()]) {
      if (!entry.isDirty) continue
      const res = await entry.save()
      if (!res.ok) {
        setError(res.error)
        setSaving(false)
        return false
      }
    }
    setSaving(false)
    router.refresh()
    return true
  }, [router])

  useEffect(() => {
    if (!dirty) return
    function onClick(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.('a[href]')
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      if (!href.startsWith('/') || a.getAttribute('target') === '_blank') return
      e.preventDefault()
      e.stopPropagation()
      setPendingHref(href)
    }
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [dirty])

  function leaveTo(href: string) {
    setPendingHref(null)
    setError('')
    router.push(href)
  }

  return (
    <SaveContext.Provider value={ctxValue}>
      {children}

      {hasForms && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4">
          {error && (
            <p className="pointer-events-auto max-w-md rounded-full bg-brick px-4 py-1.5 text-center text-xs font-bold text-paper shadow-lg">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => saveAll()}
            className={`pointer-events-auto rounded-full px-12 py-3 text-sm font-bold text-paper shadow-[0_10px_24px_-8px_rgba(36,28,21,.5)] transition-colors ${
              dirty ? 'bg-beet' : 'bg-ink/25'
            } disabled:cursor-default`}
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      )}

      {pendingHref && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setPendingHref(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-paper p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-extrabold">Есть несохранённые изменения</p>
            <p className="mt-1 text-sm text-muted">Сохранить их перед переходом?</p>
            {error && <p className="mt-2 text-xs font-semibold text-brick">{error}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  const target = pendingHref
                  if (await saveAll()) leaveTo(target)
                }}
                className="rounded-full bg-beet px-5 py-2 text-sm font-bold text-paper disabled:opacity-50"
              >
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={() => leaveTo(pendingHref)}
                className="rounded-full border border-line px-5 py-2 text-sm font-bold text-brick hover:bg-brick hover:text-paper"
              >
                Не сохранять
              </button>
              <button
                type="button"
                onClick={() => setPendingHref(null)}
                className="rounded-full border border-line px-5 py-2 text-sm font-bold text-ink/70 hover:bg-ink hover:text-paper"
              >
                Остаться
              </button>
            </div>
          </div>
        </div>
      )}
    </SaveContext.Provider>
  )
}

/** Register a form with the central save bar. */
export function useSaveRegistration(id: string, isDirty: boolean, save: () => Promise<SaveResult>) {
  const ctx = useContext(SaveContext)
  if (!ctx) throw new Error('useSaveRegistration must be used inside AdminSaveProvider')
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  useEffect(
    () => ctx.register(id, { isDirty, save: () => saveRef.current() }),
    [ctx, id, isDirty],
  )
}
