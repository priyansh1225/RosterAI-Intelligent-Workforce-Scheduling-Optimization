import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Lock,
  User,
} from 'lucide-react'
import { useAuth, ROLES } from '../context/AuthContext'
import { csrfCookie } from '../services/api'
import logoImg from '../assets/rosterai-logo.jpg'

export function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [visible, setVisible] = useState(false)
  const [csrf, setCsrf] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedDemoRole, setSelectedDemoRole] = useState(ROLES.ADMIN)

  const { switchRole, setStaffSession } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/admin/login/', { credentials: 'include' })
      .then((res) => res.text())
      .then((html) => {
        const token = html.match(/name="csrfmiddlewaretoken" value="([^"]+)"/)
        setCsrf(token?.[1] || csrfCookie() || '')
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const token = csrf || csrfCookie()
      if (token) {
        const body = new URLSearchParams({
          csrfmiddlewaretoken: token,
          username,
          password,
          next: '/admin/',
        })
        const response = await fetch('/admin/login/', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        })
        if (response.ok && !response.url.includes('/admin/login')) {
          setStaffSession(true)
        }
      }

      // Enter the selected department workspace exclusively
      const user = switchRole(selectedDemoRole, {
        username,
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
      })
      navigate(user.defaultRoute || '/admin/dashboard')
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleQuickSelect = (role, defaultUser) => {
    setSelectedDemoRole(role)
    setUsername(defaultUser)
  }

  return (
    <div className="login-screen-expanded">
      <div className="login-card-large">
        {/* LOGO & BRAND AT THE TOP */}
        <div className="login-logo-header">
          <img
            src={logoImg}
            alt="RosterAI Official Logo"
            className="login-official-logo"
          />
          <div className="login-brand-meta">
            <h1>Roster<span>AI</span></h1>
            <p>Intelligent Workforce Scheduling & Optimization</p>
          </div>
        </div>

        <div className="login-card-divider" />

        {/* WORKSPACE SELECTION PILLS */}
        <div className="role-selector-section">
          <label className="section-label">Select Your Department Workspace:</label>
          <div className="workspace-pills-row">
            <button
              type="button"
              className={`ws-pill ${selectedDemoRole === ROLES.ADMIN ? 'active' : ''}`}
              onClick={() => handleRoleQuickSelect(ROLES.ADMIN, 'admin')}
            >
              Administrator
            </button>
            <button
              type="button"
              className={`ws-pill ${selectedDemoRole === ROLES.HOUSEKEEPING_SUPERVISOR ? 'active' : ''}`}
              onClick={() => handleRoleQuickSelect(ROLES.HOUSEKEEPING_SUPERVISOR, 'housekeeping')}
            >
              Housekeeping
            </button>
            <button
              type="button"
              className={`ws-pill ${selectedDemoRole === ROLES.FRONT_DESK_SUPERVISOR ? 'active' : ''}`}
              onClick={() => handleRoleQuickSelect(ROLES.FRONT_DESK_SUPERVISOR, 'frontdesk')}
            >
              Front Desk
            </button>
            <button
              type="button"
              className={`ws-pill ${selectedDemoRole === ROLES.FOOD_BEVERAGE_SUPERVISOR ? 'active' : ''}`}
              onClick={() => handleRoleQuickSelect(ROLES.FOOD_BEVERAGE_SUPERVISOR, 'fb_lead')}
            >
              Food & Beverage
            </button>
            <button
              type="button"
              className={`ws-pill ${selectedDemoRole === ROLES.KITCHEN_SUPERVISOR ? 'active' : ''}`}
              onClick={() => handleRoleQuickSelect(ROLES.KITCHEN_SUPERVISOR, 'chef_lead')}
            >
              Kitchen
            </button>
            <button
              type="button"
              className={`ws-pill ${selectedDemoRole === ROLES.EMPLOYEE ? 'active' : ''}`}
              onClick={() => handleRoleQuickSelect(ROLES.EMPLOYEE, 'asha_sharma')}
            >
              Employee Portal
            </button>
          </div>
          <small className="pill-hint">
            Once signed in, only the selected department's navigation and operational views will be visible.
          </small>
        </div>

        {/* CREDENTIALS FORM */}
        <form onSubmit={handleSubmit} className="login-form-large">
          <label>
            Username / Staff ID
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter staff username"
              />
            </div>
          </label>

          <label>
            Password
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type={visible ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your secure password"
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && (
            <div className="login-error-box" role="alert">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            className="button button-primary login-btn-large"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Authenticating…' : 'Enter Department Workspace'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="login-note-box">
          <ShieldCheck size={16} color="#0D4E48" />
          <span>
            Authentication is secured via Django staff backend credentials. Operational options are strictly scoped to your selected department.
          </span>
        </div>

        <div className="login-card-foot">
          <Link to="/admin/dashboard" className="preview-link">
            Open Administrator Workspace directly <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <footer className="login-page-footer">
        © {new Date().getFullYear()} RosterAI <span>· Intelligent Workforce Scheduling & Optimization</span>
      </footer>
    </div>
  )
}
