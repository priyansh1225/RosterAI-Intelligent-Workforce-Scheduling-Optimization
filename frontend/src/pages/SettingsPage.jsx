import React from 'react'
import {
  Settings,
  Server,
  ShieldCheck,
  Database,
  ExternalLink,
  Code2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import { Panel } from '../components/Common'

export function SettingsPage() {
  const { staffSession, currentUser } = useAuth()
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:8000'

  return (
    <AppLayout
      pageTitle="System Settings & Integration"
      pageDescription="Backend endpoints status, environment parameters, and active authentication session."
    >
      <div className="bento-grid">
        <Panel
          title="API Configuration & Endpoints"
          subtitle="Django REST Framework connection parameters"
          className="span-7"
        >
          <div className="settings-list">
            <div className="settings-row">
              <div className="settings-label">
                <b>API Root URL</b>
                <small>Connected REST endpoint prefix</small>
              </div>
              <code>{apiBase}</code>
            </div>
            <div className="settings-row">
              <div className="settings-label">
                <b>Development Proxy Target</b>
                <small>Django development server</small>
              </div>
              <code>{backendOrigin}</code>
            </div>
            <div className="settings-row">
              <div className="settings-label">
                <b>Django Staff Session</b>
                <small>Session cookie verification</small>
              </div>
              <span className={`status-pill ${staffSession ? 'pill-active' : 'pill-inactive'}`}>
                {staffSession ? 'Authenticated' : 'Not Connected'}
              </span>
            </div>
            <div className="settings-row">
              <div className="settings-label">
                <b>Active Role Workspace</b>
                <small>Operational permissions mode</small>
              </div>
              <b>{currentUser.displayName}</b>
            </div>
          </div>

          <div className="settings-action-row">
            <a
              href="/admin/"
              target="_blank"
              rel="noreferrer"
              className="button button-quiet"
            >
              <ExternalLink size={14} /> Open Django Admin
            </a>
          </div>
        </Panel>

        <Panel
          title="Backend Modules Status"
          subtitle="Model and database table synchronization"
          className="span-5"
        >
          <div className="module-status-list">
            <div className="module-item">
              <div className="mod-head">
                <b>departments.Department</b>
                <span className="mod-tag active">Live</span>
              </div>
              <small>CRUD endpoints connected at /api/departments/</small>
            </div>
            <div className="module-item">
              <div className="mod-head">
                <b>employees.Employee & Leave</b>
                <span className="mod-tag active">Live</span>
              </div>
              <small>Employee directory & leave requests connected</small>
            </div>
            <div className="module-item">
              <div className="mod-head">
                <b>scheduling.Roster & Shift</b>
                <span className="mod-tag active">Live</span>
              </div>
              <small>Draft generation, approve & publish connected</small>
            </div>
            <div className="module-item">
              <div className="mod-head">
                <b>forecasting.StaffingRule</b>
                <span className="mod-tag active">Live</span>
              </div>
              <small>Occupancy demand ratios and rules connected</small>
            </div>
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}
