export function orderNumber(token: string): string {
  return '#' + token.slice(0, 8).toUpperCase()
}
export function formatOrderTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
