export function normalizePhone(input: string): string {
  const trimmed = input.trim()
  const plus = trimmed.startsWith('+') ? '+' : ''
  return plus + trimmed.replace(/[^\d]/g, '')
}

export function isValidPlPhone(input: string): boolean {
  let digits = normalizePhone(input).replace(/^\+/, '')
  if (digits.startsWith('48')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  return /^\d{9}$/.test(digits)
}
