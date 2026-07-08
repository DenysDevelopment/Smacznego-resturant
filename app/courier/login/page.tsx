import { LoginForm } from '@/components/admin/LoginForm'
export const dynamic = 'force-dynamic'
export default function CourierLoginPage() {
  return <LoginForm role="courier" redirectTo="/courier" />
}
