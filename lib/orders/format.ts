export function orderNumber(token: string): string {
  return '#' + token.slice(0, 8).toUpperCase()
}
export function formatOrderTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const scheduledFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Warsaw',
  weekday: 'short', day: '2-digit', month: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
})
/** Customer's preferred delivery/pickup time in Warsaw wall-clock, e.g. "пт, 25.07, 18:30". */
export function formatScheduledFor(iso: string): string {
  return scheduledFmt.format(new Date(iso))
}
