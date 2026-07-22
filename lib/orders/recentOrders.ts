// Client-side memory of the customer's recent order tokens (guest checkout,
// no account). Lets the site link back to an order after leaving the page.
const KEY = 'sc_orders'
const MAX = 5

export function getRecentOrders(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function rememberOrder(token: string): void {
  if (typeof window === 'undefined') return
  try {
    const list = [token, ...getRecentOrders().filter((t) => t !== token)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore quota/serialization errors */
  }
}

export function forgetOrder(token: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(getRecentOrders().filter((t) => t !== token)))
  } catch {
    /* ignore */
  }
}
