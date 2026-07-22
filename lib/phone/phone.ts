export function normalizePhone(input: string): string {
  const trimmed = input.trim()
  const plus = trimmed.startsWith('+') ? '+' : ''
  return plus + trimmed.replace(/[^\d]/g, '')
}

export function isValidPlPhone(input: string): boolean {
  let digits = normalizePhone(input).replace(/^\+/, '')
  // Only strip a prefix when the length indicates one is actually present,
  // so a bare 9-digit number that happens to start with "48"/"0" isn't mangled.
  if (digits.length === 11 && digits.startsWith('48')) digits = digits.slice(2)
  else if (digits.length === 10 && digits.startsWith('0')) digits = digits.slice(1)
  return /^\d{9}$/.test(digits)
}
