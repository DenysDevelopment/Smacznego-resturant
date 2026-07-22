// Pure złoty <-> grosze helpers for admin form inputs.

/**
 * "34" | "34,5" | "34.50" -> grosze. Returns null for empty/garbage/negative
 * (or, without allowNegative, any minus sign). Max two decimal digits.
 */
export function parseZlotyToGrosze(input: string, opts?: { allowNegative?: boolean }): number | null {
  const trimmed = input.trim().replace(',', '.')
  const re = opts?.allowNegative ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/
  if (!re.test(trimmed)) return null
  const negative = trimmed.startsWith('-')
  const [zl, gr = ''] = trimmed.replace(/^-/, '').split('.')
  const grosze = Number(zl) * 100 + Number((gr + '00').slice(0, 2))
  return negative ? -grosze : grosze
}

/** 3400 -> "34.00" (form prefill). */
export function formatGroszeToZlotyInput(grosze: number): string {
  const sign = grosze < 0 ? '-' : ''
  const abs = Math.abs(grosze)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}
