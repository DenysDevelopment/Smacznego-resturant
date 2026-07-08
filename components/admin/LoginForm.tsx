'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth/actions'
import type { Role } from '@/lib/auth/passcode'

export function LoginForm({ role, redirectTo }: { role: Role; redirectTo: string }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    start(async () => {
      const res = await login(role, code)
      if (res.ok) router.replace(redirectTo)
      else setError(res.error === 'not_configured' ? 'Не настроено (нет AUTH_SECRET/кода)' : 'Неверный код')
    })
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-24 flex max-w-xs flex-col gap-3 px-6">
      <h1 className="text-2xl font-extrabold">{role === 'courier' ? 'Вход курьера' : 'Вход персонала'}</h1>
      <input
        type="password" inputMode="numeric" autoFocus value={code}
        onChange={(e) => setCode(e.target.value)} placeholder="Код доступа"
        className="rounded-xl border border-line bg-panel px-4 py-3 text-base outline-none focus:border-beet"
      />
      {error && <p className="text-sm font-semibold text-beet">{error}</p>}
      <button
        type="submit" disabled={pending || !code}
        className="rounded-xl bg-beet px-4 py-3 font-bold text-paper disabled:opacity-50"
      >
        {pending ? 'Проверяем…' : 'Войти'}
      </button>
    </form>
  )
}
