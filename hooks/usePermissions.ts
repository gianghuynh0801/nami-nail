import { useSession } from 'next-auth/react'
import { PERMISSIONS, Permission } from '@/lib/permissions'

export function usePermissions() {
  const { data: session } = useSession()
  
  const hasPermission = (permission: Permission) => {
    if (!session?.user) return false
    
    // OWNER has all permissions
    if (session.user.role === 'OWNER') return true
    
    // Check specific permission
    return session.user.permissions?.includes(permission) || false
  }

  const hasAnyPermission = (permissions: Permission[]) => {
    return permissions.some(hasPermission)
  }

  const hasAllPermissions = (permissions: Permission[]) => {
    return permissions.every(hasPermission)
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    role: session?.user?.role,
    user: session?.user,
  }
}
