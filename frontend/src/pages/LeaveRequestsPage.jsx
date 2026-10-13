import React, { useState } from 'react'
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import { Panel, StatusBadge, EmptyState, ConfirmDialog } from '../components/Common'
import { api, fmtDate, initials } from '../services/api'

export function LeaveRequestsPage() {
  const { data, reload } = useData()
  const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

  const [form, setForm] = useState({
    employee: '',
    start_date: today,
    end_date: today,
    reason: '',
  })
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [activeDecision, setActiveDecision] = useState(null)
  const [decisionNote, setDecisionNote] = useState('')

  const handleCreateLeave = async (e) => {
    e.preventDefault()
    setBusy(true)
    setFeedback('')
    try {
      await api('/employees/leave-requests/', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          employee: Number(form.employee),
        }),
      })
      setForm({ employee: '', start_date: today, end_date: today, reason: '' })
      reload()
      setFeedback('Leave request submitted in pending status.')
      setTimeout(() => setFeedback(''), 4000)
    } catch (err) {
      setFeedback(`Submission error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const handleDecision = async (status) => {
    if (!activeDecision) return
    setBusy(true)
    try {
      await api(`/employees/leave-requests/${activeDecision.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          decision_note: decisionNote || `Decision recorded as ${status} by administrator.`,
        }),
      })
      setActiveDecision(null)
      setDecisionNote('')
      reload()
      setFeedback(`Leave request marked as ${status}.`)
      setTimeout(() => setFeedback(''), 4000)
    } catch (err) {
      setFeedback(`Decision error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppLayout
      pageTitle="Leave Requests & Time-Off Approvals"
      pageDescription="Review employee time-away requests, inspect potential roster schedule conflicts, and record approval decisions."
    >
      {feedback && (
        <div className={`toast-banner ${feedback.startsWith('Submission error') || feedback.startsWith('Decision error') ? 'error' : 'success'}`}>
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>×</button>
        </div>
      )}

      <div className="bento-grid">
        {/* SUBMIT REQUEST FORM (span-5) */}
        <Panel
          title="Submit Leave Request"
          subtitle="File a new employee absence request"
          className="span-5"
        >
          <form className="compact-form" onSubmit={handleCreateLeave}>
            <label>
              Employee
              <select
                required
                value={form.employee}
                onChange={(e) => setForm({ ...form, employee: e.target.value })}
              >
                <option value="">Select Employee</option>
                {data.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_code}) — {emp.department_name}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid">
              <label>
                Start Date
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </label>
              <label>
                End Date
                <input
                  type="date"
                  required
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </label>
            </div>

            <label>
              Reason / Instructions
              <textarea
                rows="3"
                required
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Personal leave, medical appointment, vacation..."
              />
            </label>

            <button
              type="submit"
              className="button button-primary full-button"
              disabled={busy}
            >
              {busy ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </form>
        </Panel>

        {/* LEAVE MANAGEMENT QUEUE (span-7) */}
        <Panel
          title="Leave Approvals Queue"
          subtitle={`${data.leave.length} total request records`}
          className="span-7"
        >
          {data.leave.length > 0 ? (
            <div className="leave-list">
              {data.leave.map((l) => (
                <div className="leave-row leave-row-card" key={l.id}>
                  <div className="avatar avatar-soft">
                    {initials(l.employee_name)}
                  </div>
                  <div className="leave-info">
                    <div className="leave-name-row">
                      <b>{l.employee_name}</b>
                      <StatusBadge status={l.status} />
                    </div>
                    <small>
                      {fmtDate(l.start_date)} to {fmtDate(l.end_date)} · Reason: "{l.reason}"
                    </small>
                    {l.decision_note && (
                      <div className="decision-note-box">
                        <b>Decision Note:</b> {l.decision_note}
                      </div>
                    )}
                  </div>
                  {l.status === 'PENDING' && (
                    <div className="leave-actions">
                      <button
                        className="button button-small button-success"
                        onClick={() => {
                          setActiveDecision(l)
                          setDecisionNote('Approved by administrator.')
                        }}
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No leave requests filed yet"
              description="Submitted leave requests will appear here for manager review."
              icon={CalendarDays}
            />
          )}
        </Panel>

        {/* ROSTER CONFLICT NOTICE (span-12) */}
        <Panel
          title="Automatic Roster Adjustment Policy"
          subtitle="How approved leave affects future scheduling"
          className="span-12"
        >
          <div className="notice-banner-content">
            <ShieldCheck size={20} color="#315efb" />
            <div>
              <b>Constraint Enforcement on Approval:</b>
              <p>
                When a leave request is marked <code>APPROVED</code>, the scheduling allocator excludes the employee
                from draft candidate pools for the affected dates. Future rosters with existing shifts will flag
                coverage shortages for replacement reallocation.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {/* DECISION MODAL */}
      {activeDecision && (
        <div className="dialog-scrim">
          <div className="dialog-modal">
            <div className="dialog-head">
              <div>
                <h2>Review Leave Request</h2>
                <p>
                  {activeDecision.employee_name} · {fmtDate(activeDecision.start_date)} to {fmtDate(activeDecision.end_date)}
                </p>
              </div>
              <button className="icon-button" onClick={() => setActiveDecision(null)}>
                ×
              </button>
            </div>

            <div>
              <p className="request-reason-text">
                <b>Submitted Reason:</b> "{activeDecision.reason}"
              </p>

              <label>
                Decision Note & Justification:
                <textarea
                  rows="3"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="Provide decision rationale..."
                />
              </label>

              <div className="dialog-actions">
                <button
                  type="button"
                  className="button button-destructive"
                  onClick={() => handleDecision('REJECTED')}
                  disabled={busy}
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => handleDecision('APPROVED')}
                  disabled={busy}
                >
                  Approve Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
