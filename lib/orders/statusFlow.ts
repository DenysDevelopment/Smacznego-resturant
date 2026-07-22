export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'ready'
  | 'out_for_delivery' | 'delivered' | 'picked_up'
  | 'cancelled' | 'rejected'
export type OrderType = 'delivery' | 'pickup'

export const STATUS_LABEL_RU: Record<OrderStatus, string> = {
  pending: 'Новый',
  confirmed: 'Принят',
  preparing: 'Готовится',
  ready: 'Готов',
  out_for_delivery: 'В доставке',
  delivered: 'Доставлен',
  picked_up: 'Выдан',
  cancelled: 'Отменён',
  rejected: 'Отклонён',
}

// Allowed forward transitions, keyed by order type (some depend on delivery vs pickup).
function allowed(type: OrderType, from: OrderStatus): OrderStatus[] {
  switch (from) {
    case 'pending': return ['confirmed', 'rejected']
    case 'confirmed': return ['preparing', 'cancelled']
    case 'preparing': return ['ready', 'cancelled']
    case 'ready': return type === 'delivery'
      ? ['out_for_delivery', 'cancelled']
      : ['picked_up', 'cancelled']
    case 'out_for_delivery': return ['delivered', 'cancelled']
    default: return [] // delivered, picked_up, cancelled, rejected are terminal
  }
}

export function canTransition(type: OrderType, from: OrderStatus, to: OrderStatus): boolean {
  return allowed(type, from).includes(to)
}

export type StatusAction = { to: OrderStatus; label: string; tone: 'primary' | 'danger' | 'neutral' }

const LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Принять',
  rejected: 'Отклонить',
  preparing: 'Готовим',
  ready: 'Готов',
  picked_up: 'Выдан',
  cancelled: 'Отменить',
  out_for_delivery: 'Забрал',
  delivered: 'Доставлен',
}
const TONE: Partial<Record<OrderStatus, StatusAction['tone']>> = {
  rejected: 'danger', cancelled: 'danger',
}

function action(to: OrderStatus): StatusAction {
  return { to, label: LABEL[to] ?? to, tone: TONE[to] ?? 'primary' }
}

// Operator: everything except the courier-owned ready->out_for_delivery and out_for_delivery->delivered.
export function operatorActions(type: OrderType, status: OrderStatus): StatusAction[] {
  return allowed(type, status)
    .filter((to) => to !== 'out_for_delivery' && to !== 'delivered')
    .map(action)
}

// Courier: only the delivery hand-off steps.
export function courierActions(status: OrderStatus): StatusAction[] {
  if (status === 'ready') return [action('out_for_delivery')]
  if (status === 'out_for_delivery') return [action('delivered')]
  return []
}

// A delivery order the courier should see: ready to pick up, or already en route.
export function isCourierVisible(o: { type: OrderType; status: OrderStatus }): boolean {
  return o.type === 'delivery' && (o.status === 'ready' || o.status === 'out_for_delivery')
}
