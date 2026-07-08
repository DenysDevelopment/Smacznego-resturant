import type { Role } from '@/lib/auth/passcode'
import { canTransition, courierActions, type OrderStatus, type OrderType } from './statusFlow'

type Session = { role: Role } | null
type OrderRef = { type: OrderType; status: OrderStatus }

// Pure guard: role + transition legality. Exported for unit testing.
export function guardTransition(
  session: Session,
  order: OrderRef,
  to: OrderStatus,
): { ok: true } | { ok: false; error: string } {
  if (!session) return { ok: false, error: 'unauthorized' }
  if (!canTransition(order.type, order.status, to)) return { ok: false, error: 'illegal_transition' }
  if (session.role === 'courier') {
    // Courier may only drive the delivery hand-off steps. Staff may drive any legal transition.
    const allowed = courierActions(order.status).some((a) => a.to === to)
    if (!allowed) return { ok: false, error: 'forbidden_for_role' }
  }
  return { ok: true }
}
