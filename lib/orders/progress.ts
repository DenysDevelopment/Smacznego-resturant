import type { OrderStatus, OrderType } from './statusFlow'

export type StepState = 'done' | 'current' | 'todo'
export interface ProgressStep { key: OrderStatus; state: StepState }
export type OrderProgress =
  | { kind: 'flow'; steps: ProgressStep[] }
  | { kind: 'failed'; status: OrderStatus } // cancelled | rejected

const DELIVERY_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']
const PICKUP_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up']

/**
 * Customer-facing progress for an order: an ordered list of steps with each
 * marked done/current/todo, or a "failed" marker for cancelled/rejected.
 *
 * `hidden` removes toggled-off middle steps from the display. The first
 * (pending) and last (delivered/picked_up) steps are always kept. "current"
 * is the furthest visible step the order has actually reached, so a hidden
 * step the order is currently in collapses onto the previous visible one.
 */
export function orderProgress(type: OrderType, status: OrderStatus, hidden?: ReadonlySet<OrderStatus>): OrderProgress {
  if (status === 'cancelled' || status === 'rejected') return { kind: 'failed', status }

  const flow = type === 'pickup' ? PICKUP_FLOW : DELIVERY_FLOW
  const currentIdx = flow.indexOf(status)

  const visible = flow.filter((key, i) => i === 0 || i === flow.length - 1 || !hidden?.has(key))
  // furthest visible step index that the order has reached (≤ current)
  const reachedIdx = Math.max(...visible.map((k) => flow.indexOf(k)).filter((i) => i <= currentIdx))

  return {
    kind: 'flow',
    steps: visible.map((key) => {
      const i = flow.indexOf(key)
      return { key, state: i < reachedIdx ? 'done' : i === reachedIdx ? 'current' : 'todo' }
    }),
  }
}
