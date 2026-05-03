import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import type { RolUsuario } from '@/types/models'

interface Props {
  requiredRole: RolUsuario
  fallback?: ReactNode
  children: ReactNode
}

export function RoleGuard({ requiredRole, fallback = null, children }: Props) {
  const user = useAuthStore((s) => s.user)
  if (!user || user.rol !== requiredRole) return <>{fallback}</>
  return <>{children}</>
}
