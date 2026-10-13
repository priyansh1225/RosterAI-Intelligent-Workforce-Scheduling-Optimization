import React, { useState } from 'react'
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import { Panel, StatusBadge, EmptyState, ConfirmDialog } from '../components/Common'
import { api, fmtDate, timeOf, initials, getTodayStr, getTomorrowStr, addDays } from '../services/api'

export function RostersPage() {
  const { data, reload } = useData()
  const { staffSession } = useAuth()
  const today = getTodayStr()
  const tomorrow = getTomorrowStr()

  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedRosterId, setSelectedRosterId] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [confirmPublish, setConfirmPublish] = useState(null)
  const [confirmApprove, setConfirmApprove] = useState(null)
  const [approvalNote, setApprovalNote] = useState('Reviewed and approved by Operations Management.')

  const currentRoster =
    data.rosters.find((r) => String(r.id) === String(selectedRosterId)) ||
    data.rosters[0]

  const handleGenerateDraft = async () => {
    setBusy(true)
    setFeedback('')
    try {
      // Ensure baseline projected occupancy exists for upcoming forecast date
      const hasOcc = data.occupancy.some((o) => o.date === selectedDate)
      if (!hasOcc) {
        await api('/occupancy/', {
          method: 'POST',
          body: JSON.stringify({
            date: selectedDate,
            total_rooms: 200,
            occupied_rooms: 165,
            expected_check_ins: 38,
            expected_check_outs: 32,
            notes: `Projected occupancy baseline for ${selectedDate}`,
          }),
        }).catch(() => {})
      }

      await api('/rosters/generate/', {
        method: 'POST',
        body: JSON.stringify({ date: selectedDate }),
      })
      reload()
      setFeedback(`New draft roster generated successfully for ${fmtDate(selectedDate)}.`)
      setTimeout(() => setFeedback(''), 4000)
    } catch (err) {
      setFeedback(`Generation failed: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const handleApproveRoster = async () => {
    if (!confirmApprove) return
    setBusy(true)
    try {
      await api(`/rosters/${confirmApprove.id}/approve/`, {
        method: 'POST',
        body: JSON.stringify({ approval_note: approvalNote }),
      })
      setConfirmApprove(null)
      reload()
      setFeedback('Draft roster approved and ready for publication.')
      setTimeout(() => setFeedback(''), 4000)
    } catch (err) {
      setFeedback(`Approval failed: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const handlePublishRoster = async () => {
    if (!confirmPublish) return
    setBusy(true)
    try {
      await api(`/rosters/${confirmPublish.id}/publish/`, {
        method: 'POST',
      })
      setConfirmPublish(null)
      reload()
      setFeedback('Roster published atomically. Assigned shifts are locked.')
      setTimeout(() => setFeedback(''), 4000)
    } catch (err) {
      setFeedback(`Publication failed: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppLayout
      pageTitle="Roster & Shift Scheduling"
      pageDescription="Review daily and weekly shift schedules, approve draft recommendations, and publish final rosters."
      actions={
        <div className="action-buttons">
          <div className="forecast-quick-chips">
            <button
              type="button"
              className={`chip-button ${selectedDate === today ? 'active' : ''}`}
              onClick={() => setSelectedDate(today)}
            >
              Today
            </button>
            <button
              type="button"
              className={`chip-button ${selectedDate === tomorrow ? 'active' : ''}`}
              onClick={() => setSelectedDate(tomorrow)}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className={`chip-button ${selectedDate === addDays(today, 2) ? 'active' : ''}`}
              onClick={() => setSelectedDate(addDays(today, 2))}
            >
              +2d
            </button>
            <button
              type="button"
              className={`chip-button ${selectedDate === addDays(today, 7) ? 'active' : ''}`}
              onClick={() => setSelectedDate(addDays(today, 7))}
            >
              +7d
            </button>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input-header"
          />
          <button
            className="button button-primary"
            onClick={handleGenerateDraft}
            disabled={busy}
          >
            <Sparkles size={15} />
            {busy ? 'Generating...' : `Generate Draft (${fmtDate(selectedDate)})`}
          </button>
        </div>
      }
    >
      {feedback && (
        <div className={`toast-banner ${feedback.startsWith('Generation failed') || feedback.startsWith('Approval failed') ? 'error' : 'success'}`}>
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>×</button>
        </div>
      )}

      <div className="single-stack">
        {/* WEEKLY OVERVIEW TABLE */}
        <Panel
          title="Weekly Assigned Coverage"
          subtitle="All confirmed and draft shifts for the active calendar week"
        >
          {data.weeklyShifts?.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Shift Times</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weeklyShifts.map((shift) => {
                    const start = new Date(shift.start_at)
                    const end = new Date(shift.end_at)
                    const hrs = ((end - start) / 3600000).toFixed(1)
                    return (
                      <tr key={shift.id}>
                        <td>
                          <div className="person-cell">
                            <div className="avatar avatar-tiny">
                              {initials(shift.employee_name)}
                            </div>
                            <div>
                              <b>{shift.employee_name || 'Staff Member'}</b>
                              <small>Shift #{shift.id}</small>
                            </div>
                          </div>
                        </td>
                        <td>{shift.department_name}</td>
                        <td>{fmtDate(shift.start_at)}</td>
                        <td>
                          {timeOf(shift.start_at)} – {timeOf(shift.end_at)}
                        </td>
                        <td>{hrs} hours</td>
                        <td>
                          <StatusBadge status={shift.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No weekly shift records found"
              description="Click 'Generate Daily Draft' to allocate scheduled shifts based on occupancy."
              icon={CalendarDays}
            />
          )}
        </Panel>

        {/* DAILY ROSTER MANAGEMENT PANEL */}
        <Panel
          title={
            currentRoster
              ? `Daily Roster — ${fmtDate(currentRoster.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
              : 'Daily Roster Management'
          }
          subtitle="Manager review and approval workflow before publishing to employees"
          action={
            currentRoster && (
              <div className="roster-header-actions">
                <StatusBadge status={currentRoster.status} />
                {currentRoster.status === 'DRAFT' && (
                  <button
                    className="button button-quiet"
                    onClick={() => setConfirmApprove(currentRoster)}
                  >
                    Approve Draft
                  </button>
                )}
                {currentRoster.status === 'APPROVED' && (
                  <button
                    className="button button-primary"
                    onClick={() => setConfirmPublish(currentRoster)}
                  >
                    Publish to Staff
                  </button>
                )}
              </div>
            )
          }
        >
          {/* ROSTER SELECTOR */}
          <div className="toolbar roster-select-bar">
            <div className="select-wrapper">
              <label htmlFor="roster-dropdown">Select Daily Roster Record:</label>
              <select
                id="roster-dropdown"
                value={selectedRosterId || currentRoster?.id || ''}
                onChange={(e) => setSelectedRosterId(e.target.value)}
              >
                {data.rosters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {fmtDate(r.date)} — Status: {r.status} (ID: #{r.id})
                  </option>
                ))}
              </select>
            </div>
            <span className="roster-stats-pill">
              {currentRoster?.shifts?.length || 0} Shifts Assigned
            </span>
          </div>

          {/* SHORTAGES WARNING */}
          {currentRoster?.shortage_summary?.length > 0 && (
            <div className="shortage-box">
              <AlertTriangle size={18} />
              <div>
                <b>Unresolved Staffing Shortages Identified</b>
                <p>
                  {currentRoster.shortage_summary
                    .map((s) => (typeof s === 'string' ? s : `${s.department}: ${s.shortage || 1} unfilled slot(s)`))
                    .join(' · ')}
                </p>
                <small>Review required justification note prior to approving this roster.</small>
              </div>
            </div>
          )}

          {/* ROSTER SHIFTS */}
          {currentRoster?.shifts?.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Assigned Employee</th>
                    <th>Department</th>
                    <th>Shift Timing</th>
                    <th>Required Skills</th>
                    <th>Assignment Source</th>
                    <th>Shift Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRoster.shifts.map((shift) => (
                    <tr key={shift.id}>
                      <td>
                        <div className="person-cell">
                          <div className="avatar avatar-soft">
                            {initials(shift.employee_name)}
                          </div>
                          <div>
                            <b>{shift.employee_name || 'Assigned Staff'}</b>
                            <small>{shift.employee_code || `ID #${shift.id}`}</small>
                          </div>
                        </div>
                      </td>
                      <td>{shift.department_name}</td>
                      <td>
                        {timeOf(shift.start_at)} – {timeOf(shift.end_at)}
                      </td>
                      <td>
                        <div className="skill-list">
                          {(shift.required_skills || []).map((sk) => (
                            <span key={sk} className="skill-chip">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="source-tag">{shift.assignment_source || 'AUTO'}</span>
                      </td>
                      <td>
                        <StatusBadge status={shift.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No shifts in this roster"
              description="Click 'Generate Daily Draft' to evaluate constraints and create assignments."
              icon={Clock}
            />
          )}

          {currentRoster?.approval_note && (
            <div className="notice-panel">
              <ShieldCheck size={16} />
              <div>
                <b>Manager Approval Note:</b>
                <p>{currentRoster.approval_note}</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* APPROVE CONFIRMATION DIALOG */}
      {confirmApprove && (
        <div className="dialog-scrim">
          <div className="dialog-modal">
            <div className="dialog-head">
              <div>
                <h2>Approve Draft Roster</h2>
                <p>
                  Confirm review for {fmtDate(confirmApprove.date)}. Provide an audit approval note.
                </p>
              </div>
              <button className="icon-button" onClick={() => setConfirmApprove(null)}>
                ×
              </button>
            </div>
            <div>
              <label>
                Approval Justification Note:
                <textarea
                  rows="3"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="Explain coverage or justifications for any identified shortages..."
                />
              </label>
              <div className="dialog-actions">
                <button
                  className="button button-quiet"
                  onClick={() => setConfirmApprove(null)}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  onClick={handleApproveRoster}
                  disabled={busy}
                >
                  {busy ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!confirmPublish}
        title="Publish Final Roster"
        message={`Are you sure you want to publish the roster for ${confirmPublish ? fmtDate(confirmPublish.date) : ''}? Once published, shifts become visible to all employees and locked from routine modification.`}
        confirmText="Publish Roster"
        onConfirm={handlePublishRoster}
        onCancel={() => setConfirmPublish(null)}
      />
    </AppLayout>
  )
}
