'use client'
import { createContext, useContext } from 'react'
import type { Settings } from '@/lib/settings/types'

const SettingsContext = createContext<Settings | null>(null)

export function SettingsProvider({ value, children }: { value: Settings; children: React.ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
