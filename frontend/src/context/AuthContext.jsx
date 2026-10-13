import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export const ROLES = {
  ADMIN: 'ADMIN',
  HOUSEKEEPING_SUPERVISOR: 'HOUSEKEEPING_SUPERVISOR',
  FRONT_DESK_SUPERVISOR: 'FRONT_DESK_SUPERVISOR',
  FOOD_BEVERAGE_SUPERVISOR: 'FOOD_BEVERAGE_SUPERVISOR',
  KITCHEN_SUPERVISOR: 'KITCHEN_SUPERVISOR',
  EMPLOYEE: 'EMPLOYEE',
}

export const ROLE_DETAILS = {
  [ROLES.ADMIN]: {
    name: 'Administrator',
    department: 'Executive Operations',
    defaultRoute: '/admin/dashboard',
    canVerify: true,
    canManage: true,
  },
  [ROLES.HOUSEKEEPING_SUPERVISOR]: {
    name: 'Housekeeping Supervisor',
    department: 'Housekeeping',
    defaultRoute: '/housekeeping/dashboard',
    canVerify: true,
    canManage: true,
  },
  [ROLES.FRONT_DESK_SUPERVISOR]: {
    name: 'Front Desk Lead',
    department: 'Front Desk',
    defaultRoute: '/front-desk/dashboard',
    canVerify: true,
    canManage: true,
  },
  [ROLES.FOOD_BEVERAGE_SUPERVISOR]: {
    name: 'F&B Supervisor',
    department: 'Food & Beverage',
    defaultRoute: '/food-beverage/dashboard',
    canVerify: true,
    canManage: true,
  },
  [ROLES.KITCHEN_SUPERVISOR]: {
    name: 'Kitchen Chef Supervisor',
    department: 'Kitchen',
    defaultRoute: '/kitchen/dashboard',
    canVerify: true,
    canManage: true,
  },
  [ROLES.EMPLOYEE]: {
    name: 'Staff Employee',
    department: 'Housekeeping',
    defaultRoute: '/employee/dashboard',
    employeeId: 1,
    employeeName: 'Asha Sharma',
    canVerify: false,
    canManage: false,
  },
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rosterai_current_user')
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return {
      username: 'admin',
      role: ROLES.ADMIN,
      displayName: 'Hotel Administrator',
      ...ROLE_DETAILS[ROLES.ADMIN],
      isStaffSession: false,
    }
  })

  const [staffSession, setStaffSession] = useState(false)

  // Verify whether Django staff session cookie exists
  useEffect(() => {
    fetch('/admin/', { credentials: 'include' })
      .then((res) => {
        const isStaff = res.ok && !res.url.includes('/admin/login')
        setStaffSession(isStaff)
        if (isStaff && currentUser.role === ROLES.ADMIN) {
          setCurrentUser((prev) => ({ ...prev, isStaffSession: true }))
        }
      })
      .catch(() => setStaffSession(false))
  }, [])

  const switchRole = (newRole, extra = {}) => {
    const roleInfo = ROLE_DETAILS[newRole] || ROLE_DETAILS[ROLES.ADMIN]
    const updated = {
      username: newRole.toLowerCase(),
      role: newRole,
      displayName: extra.displayName || roleInfo.name,
      ...roleInfo,
      ...extra,
      isStaffSession: staffSession,
    }
    setCurrentUser(updated)
    try {
      localStorage.setItem('rosterai_current_user', JSON.stringify(updated))
    } catch {}
    return updated
  }

  const logout = () => {
    const defaultUser = {
      username: 'admin',
      role: ROLES.ADMIN,
      displayName: 'Hotel Administrator',
      ...ROLE_DETAILS[ROLES.ADMIN],
      isStaffSession: false,
    }
    setCurrentUser(defaultUser)
    localStorage.removeItem('rosterai_current_user')
    // Trigger django logout
    fetch('/admin/logout/', { credentials: 'include' }).catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ currentUser, staffSession, setStaffSession, switchRole, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
