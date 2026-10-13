import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronDown,
  DoorOpen,
  FileBarChart2,
  Grid2X2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useAuth, ROLES } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { initials } from '../services/api'
import logoImg from '../assets/rosterai-logo.jpg'

export const DEPARTMENT_ROUTES = {
  [ROLES.ADMIN]: [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/workforce', label: 'Workforce', icon: Users },
    { path: '/admin/departments', label: 'Departments', icon: Grid2X2 },
    { path: '/admin/rosters', label: 'Rosters', icon: CalendarDays },
    { path: '/admin/rosters/suggestions', label: 'AI Suggestions', icon: Sparkles },
    { path: '/admin/occupancy', label: 'Occupancy', icon: DoorOpen },
    { path: '/admin/requests', label: 'Requests', icon: Activity },
    { path: '/admin/leave-requests', label: 'Leave', icon: CalendarDays },
    { path: '/admin/tasks', label: 'Tasks', icon: ListChecks },
    { path: '/admin/reports', label: 'Reports', icon: FileBarChart2 },
    { path: '/admin/notifications', label: 'Notifications', icon: Bell },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ],
  [ROLES.HOUSEKEEPING_SUPERVISOR]: [
    { path: '/housekeeping/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/housekeeping/staff', label: 'Staff', icon: Users },
    { path: '/housekeeping/requests', label: 'Requests', icon: Activity },
    { path: '/housekeeping/tasks', label: 'Tasks', icon: ListChecks },
    { path: '/housekeeping/floors', label: 'Floors', icon: Grid2X2 },
    { path: '/housekeeping/room-readiness', label: 'Room Readiness', icon: DoorOpen },
  ],
  [ROLES.FRONT_DESK_SUPERVISOR]: [
    { path: '/front-desk/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/front-desk/room-requests', label: 'Room Requests', icon: DoorOpen },
    { path: '/front-desk/room-status', label: 'Room Status', icon: Grid2X2 },
    { path: '/front-desk/tasks', label: 'Tasks', icon: ListChecks },
  ],
  [ROLES.FOOD_BEVERAGE_SUPERVISOR]: [
    { path: '/food-beverage/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/food-beverage/staff', label: 'Staff', icon: Users },
    { path: '/food-beverage/requests', label: 'Requests', icon: Activity },
    { path: '/food-beverage/tasks', label: 'Tasks', icon: ListChecks },
  ],
  [ROLES.KITCHEN_SUPERVISOR]: [
    { path: '/kitchen/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/kitchen/staff', label: 'Staff', icon: Users },
    { path: '/kitchen/requests', label: 'Requests', icon: Activity },
    { path: '/kitchen/tasks', label: 'Tasks', icon: ListChecks },
  ],
  [ROLES.EMPLOYEE]: [
    { path: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/employee/my-shifts', label: 'My Shifts', icon: CalendarDays },
    { path: '/employee/my-tasks', label: 'My Tasks', icon: ListChecks },
    { path: '/employee/leave-requests', label: 'Leave', icon: CalendarDays },
    { path: '/employee/notifications', label: 'Alerts', icon: Bell },
  ],
}

export function AppLayout({ children, pageTitle, pageDescription, actions }) {
  const { currentUser, staffSession, logout, switchRole } = useAuth()
  const { notifications } = useData()
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const unreadNotifs = notifications.filter((n) => !n.read).length
  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date())

  // CRITICAL REQUIREMENT: Strictly ONLY show the routes for the CURRENT role/department!
  const currentRoutes = DEPARTMENT_ROUTES[currentUser.role] || DEPARTMENT_ROUTES[ROLES.ADMIN]

  return (
    <div className="app-shell-top">
      {/* PRIMARY TOP HEADER BAR */}
      <header className="primary-topbar">
        <div className="topbar-inner">
          {/* BRAND WITH USER PROVIDED LOGO */}
          <div className="topbar-left">
            <Link to={currentUser.defaultRoute || '/admin/dashboard'} className="brand-header-link">
              <img
                src={logoImg}
                alt="RosterAI Logo"
                className="brand-logo-img"
              />
              <div className="brand-text">
                <b>Roster<span>AI</span></b>
                <small>WORKFORCE OS</small>
              </div>
            </Link>

            {/* CURRENT DEPARTMENT PILL */}
            <div className="active-dept-pill">
              <span className="dept-indicator-dot" />
              <span>{currentUser.department}</span>
            </div>
          </div>

          {/* TOPBAR RIGHT ACTIONS */}
          <div className="topbar-right">
            <div className="date-chip">
              <CalendarDays size={14} />
              <span>{todayLabel}</span>
            </div>

            <NavLink
              className="icon-button notification-button"
              to={currentUser.role === ROLES.EMPLOYEE ? '/employee/notifications' : '/admin/notifications'}
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadNotifs > 0 && <span className="notif-badge">{unreadNotifs}</span>}
            </NavLink>

            {/* SWITCH WORKSPACE ROLE DROPDOWN */}
            <div className="role-switch-wrapper">
              <button
                className="user-role-trigger"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                aria-label="Switch active role workspace"
              >
                <div className="top-avatar">
                  {initials(currentUser.displayName || currentUser.name)}
                </div>
                <div className="user-role-meta">
                  <b>{currentUser.displayName}</b>
                  <small>{currentUser.name}</small>
                </div>
                <ChevronDown size={14} className={`role-chevron ${roleMenuOpen ? 'open' : ''}`} />
              </button>

              {roleMenuOpen && (
                <div className="role-dropdown-menu">
                  <div className="dropdown-label">SWITCH DEPARTMENT WORKSPACE</div>
                  <button
                    className={`dropdown-item ${currentUser.role === ROLES.ADMIN ? 'active' : ''}`}
                    onClick={() => {
                      switchRole(ROLES.ADMIN)
                      setRoleMenuOpen(false)
                      navigate('/admin/dashboard')
                    }}
                  >
                    <b>Administrator</b>
                    <small>Full hotel oversight & published rosters</small>
                  </button>
                  <button
                    className={`dropdown-item ${currentUser.role === ROLES.HOUSEKEEPING_SUPERVISOR ? 'active' : ''}`}
                    onClick={() => {
                      switchRole(ROLES.HOUSEKEEPING_SUPERVISOR)
                      setRoleMenuOpen(false)
                      navigate('/housekeeping/dashboard')
                    }}
                  >
                    <b>Housekeeping Supervisor</b>
                    <small>Room turnover & supervisor inspections</small>
                  </button>
                  <button
                    className={`dropdown-item ${currentUser.role === ROLES.FRONT_DESK_SUPERVISOR ? 'active' : ''}`}
                    onClick={() => {
                      switchRole(ROLES.FRONT_DESK_SUPERVISOR)
                      setRoleMenuOpen(false)
                      navigate('/front-desk/dashboard')
                    }}
                  >
                    <b>Front Desk Lead</b>
                    <small>Guest arrivals & room preparation dispatch</small>
                  </button>
                  <button
                    className={`dropdown-item ${currentUser.role === ROLES.FOOD_BEVERAGE_SUPERVISOR ? 'active' : ''}`}
                    onClick={() => {
                      switchRole(ROLES.FOOD_BEVERAGE_SUPERVISOR)
                      setRoleMenuOpen(false)
                      navigate('/food-beverage/dashboard')
                    }}
                  >
                    <b>Food & Beverage Supervisor</b>
                    <small>Banquet, bar & restaurant staffing</small>
                  </button>
                  <button
                    className={`dropdown-item ${currentUser.role === ROLES.KITCHEN_SUPERVISOR ? 'active' : ''}`}
                    onClick={() => {
                      switchRole(ROLES.KITCHEN_SUPERVISOR)
                      setRoleMenuOpen(false)
                      navigate('/kitchen/dashboard')
                    }}
                  >
                    <b>Kitchen Supervisor</b>
                    <small>Culinary stations & prep deadlines</small>
                  </button>
                  <button
                    className={`dropdown-item ${currentUser.role === ROLES.EMPLOYEE ? 'active' : ''}`}
                    onClick={() => {
                      switchRole(ROLES.EMPLOYEE)
                      setRoleMenuOpen(false)
                      navigate('/employee/dashboard')
                    }}
                  >
                    <b>Employee (Asha Sharma)</b>
                    <small>Shift acceptance & task progress submission</small>
                  </button>

                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item logout-item"
                    onClick={() => {
                      logout()
                      navigate('/login')
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* MOBILE MENU TOGGLE */}
            <button
              className="icon-button mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* TOP DEPARTMENT NAVIGATION BAR — ONLY SHOWS CURRENT DEPARTMENT ROUTES */}
        <nav className={`top-nav-tabs ${mobileMenuOpen ? 'mobile-expanded' : ''}`} aria-label="Department navigation">
          <div className="tabs-container">
            {currentRoutes.map((route) => {
              const Icon = route.icon
              return (
                <NavLink
                  key={route.path}
                  to={route.path}
                  title={route.label}
                  className={({ isActive }) => `top-tab-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={13} />
                  <span>{route.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </header>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main className="main-viewport">
        <div className="content-wrap">
          {/* PAGE HEADER */}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="live-pulse" />
                ROSTERAI · {currentUser.department.toUpperCase()}
              </div>
              <h1>{pageTitle}</h1>
              {pageDescription && <p>{pageDescription}</p>}
            </div>
            {actions && <div className="heading-actions">{actions}</div>}
          </div>

          {/* PAGE CHILDREN */}
          {children}

          <footer className="footer">
            <span>© {new Date().getFullYear()} RosterAI · Intelligent Workforce Scheduling & Optimization</span>
          </footer>
        </div>
      </main>
    </div>
  )
}
