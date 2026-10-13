import React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  X,
  XCircle,
} from 'lucide-react'

export function StatusBadge({ status }) {
  const clean = (status || 'unknown').toUpperCase()
  let toneClass = 'status-default'
  let Icon = Info

  switch (clean) {
    case 'ACTIVE':
    case 'PUBLISHED':
    case 'APPROVED':
    case 'VERIFIED_COMPLETED':
    case 'ROOM_READY':
    case 'FULFILLED':
    case 'COVERED':
    case 'AVAILABLE':
      toneClass = 'status-success'
      Icon = CheckCircle2
      break
    case 'DRAFT':
    case 'PENDING':
    case 'IN_PROGRESS':
    case 'STAFF_ASSIGNED':
    case 'SHORTAGE':
    case 'PARTIAL':
      toneClass = 'status-warning'
      Icon = Clock
      break
    case 'SUBMITTED_FOR_VERIFICATION':
    case 'AWAITING_VERIFICATION':
    case 'REQUEST_CREATED':
      toneClass = 'status-info'
      Icon = HelpCircle
      break
    case 'REJECTED':
    case 'CANCELLED':
    case 'UNAVAILABLE':
    case 'OVERDUE':
    case 'FAILED':
      toneClass = 'status-error'
      Icon = AlertTriangle
      break
    default:
      toneClass = 'status-default'
      Icon = Info
  }

  // Formatting display text
  const label = clean.replace(/_/g, ' ')

  return (
    <span className={`status-badge ${toneClass}`}>
      <Icon size={12} strokeWidth={2.4} />
      <span>{label}</span>
    </span>
  )
}

export function StatCard({ label, value, foot, icon: Icon, tone = 'blue', trend }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <div className="stat-foot">
        {trend && (
          <span className={`trend ${trend.startsWith('+') ? 'trend-up' : 'trend-neutral'}`}>
            {trend}
          </span>
        )}
        <span>{foot}</span>
      </div>
    </article>
  )
}

export function Panel({ title, subtitle, action, className = '', children }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && <div className="panel-action">{action}</div>}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ title = 'No records found', description = 'There are no items matching this criteria.', icon: Icon = Info, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={24} />
      </div>
      <b>{title}</b>
      <span>{description}</span>
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}

export function LoadingState({ message = 'Loading live workspace data...' }) {
  return (
    <div className="data-loading">
      <span className="loading-spinner" />
      <div>
        <b>{message}</b>
        <small>Connecting to RosterAI service...</small>
      </div>
    </div>
  )
}

export function ConfirmDialog({ isOpen, title, message, confirmText = 'Confirm', onConfirm, onCancel, isDestructive = false }) {
  if (!isOpen) return null
  return (
    <div className="dialog-scrim">
      <div className="dialog-modal">
        <div className="dialog-head">
          <div>
            <h2>{title}</h2>
            <p>{message}</p>
          </div>
          <button className="icon-button" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="dialog-actions">
          <button className="button button-quiet" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`button ${isDestructive ? 'button-destructive' : 'button-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
