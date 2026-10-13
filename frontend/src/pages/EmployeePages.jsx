import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ListChecks,
  Clock,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  ShieldCheck,
  Send,
  HelpCircle,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import { StatCard, Panel, StatusBadge, EmptyState } from '../components/Common'
import { operationsStore } from '../services/operationsStore'
import { fmtDate, timeOf } from '../services/api'

export function EmployeeDashboard() {
  const { data, tasks, refreshOps } = useData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState('')

  const employeeName = currentUser.displayName || 'Asha Sharma'
  const myTasks = tasks.filter(
    (t) =>
      t.assigned_to?.toLowerCase() === employeeName.toLowerCase() ||
      t.assigned_to?.toLowerCase() === 'asha sharma'
  )
  const myShifts = data.weeklyShifts.filter((s) =>
    s.employee_name?.toLowerCase().includes('asha') || s.employee_name?.toLowerCase().includes('demo')
  )

  const handleUpdateStatus = (taskId, nextStatus) => {
    operationsStore.updateTaskStatus(
      taskId,
      nextStatus,
      employeeName,
      `Employee submitted status update to ${nextStatus}`
    )
    refreshOps()
    setFeedback(`Task ${taskId} updated to ${nextStatus.replace(/_/g, ' ')}!`)
    setTimeout(() => setFeedback(''), 4000)
  }

  return (
    <AppLayout
      pageTitle="Employee Self-Service Portal"
      pageDescription="Personal shift schedule, assignment acceptance, task progress submission, and time-off requests."
    >
      {feedback && (
        <div className="toast-banner success">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>×</button>
        </div>
      )}

      {/* PERSONAL STATS */}
      <div className="stats-grid">
        <StatCard
          label="My Active Tasks"
          value={myTasks.filter((t) => t.status !== 'VERIFIED_COMPLETED').length}
          foot="Assigned to you today"
          icon={ListChecks}
          tone="blue"
        />
        <StatCard
          label="Awaiting Inspection"
          value={myTasks.filter((t) => t.status === 'SUBMITTED_FOR_VERIFICATION').length}
          foot="Submitted for review"
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Verified Completed"
          value={myTasks.filter((t) => t.status === 'VERIFIED_COMPLETED').length}
          foot="Supervisor signed off"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Upcoming Shifts"
          value={myShifts.length || 3}
          foot="Published this week"
          icon={CalendarDays}
          tone="violet"
        />
      </div>

      <div className="bento-grid">
        {/* MY CURRENT TASKS (span-8) */}
        <Panel
          title="My Assigned Tasks & Progression"
          subtitle="Progress workflow: Assigned → Accepted → In Progress → Submit for Verification"
          className="span-8"
        >
          {myTasks.length > 0 ? (
            <div className="employee-task-cards">
              {myTasks.map((t) => {
                const canAccept = t.status === 'ASSIGNED'
                const canStart = t.status === 'ACCEPTED'
                const canSubmit = t.status === 'IN_PROGRESS'
                const isSubmitted = t.status === 'SUBMITTED_FOR_VERIFICATION'
                const isCompleted = t.status === 'VERIFIED_COMPLETED'

                return (
                  <div key={t.id} className="emp-task-card">
                    <div className="emp-task-top">
                      <div>
                        <b>{t.title}</b>
                        <small>{t.location} · Deadline: {timeOf(t.deadline)}</small>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                    {t.notes && <p className="emp-task-notes">"{t.notes}"</p>}

                    <div className="emp-task-actions">
                      {canAccept && (
                        <button
                          className="button button-small button-primary"
                          onClick={() => handleUpdateStatus(t.id, 'ACCEPTED')}
                        >
                          Accept Assignment
                        </button>
                      )}
                      {canStart && (
                        <button
                          className="button button-small button-primary"
                          onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                        >
                          Start Task (In Progress)
                        </button>
                      )}
                      {canSubmit && (
                        <button
                          className="button button-small button-success"
                          onClick={() => handleUpdateStatus(t.id, 'SUBMITTED_FOR_VERIFICATION')}
                        >
                          <Send size={13} /> Submit for Inspection
                        </button>
                      )}
                      {isSubmitted && (
                        <span className="awaiting-badge">
                          <Clock size={13} /> Awaiting Supervisor Verification (Inspection Pending)
                        </span>
                      )}
                      {isCompleted && (
                        <span className="verified-badge">
                          <CheckCircle2 size={13} /> Verified Completed by Supervisor
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title="No tasks assigned right now"
              description="New assignments from the auto-allocator will appear here."
              icon={ListChecks}
            />
          )}
        </Panel>

        {/* MY NEXT SHIFT (span-4) */}
        <Panel
          title="My Next Shift"
          subtitle="Hospitality workforce roster"
          className="span-4"
          action={
            <Link to="/employee/my-shifts" className="text-action">
              All Shifts <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="next-shift-card">
            <div className="next-shift-time">
              <b>08:00 AM – 04:00 PM</b>
              <span>Today · Morning Shift</span>
            </div>
            <div className="next-shift-meta">
              <span>Department: <b>Housekeeping</b></span>
              <span>Break: <b>30 mins paid</b></span>
              <span>Supervisor: <b>On Duty</b></span>
            </div>
          </div>

          <div className="notice-panel">
            <ShieldCheck size={16} />
            <p>
              Remember: Task completion requires official supervisor inspection. Self-verification is disabled to ensure 5-star hotel quality standards.
            </p>
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}

export function EmployeeShiftsPage() {
  const { data } = useData()

  const sampleShifts = [
    { id: 1, date: '2026-10-14', times: '08:00 AM – 04:00 PM', role: 'Room Attendant', dept: 'Housekeeping', status: 'PUBLISHED' },
    { id: 2, date: '2026-10-15', times: '08:00 AM – 04:00 PM', role: 'Room Attendant', dept: 'Housekeeping', status: 'PUBLISHED' },
    { id: 3, date: '2026-10-16', times: '08:00 AM – 04:00 PM', role: 'Floor Inspection', dept: 'Housekeeping', status: 'PUBLISHED' },
    { id: 4, date: '2026-10-18', times: '09:00 AM – 05:00 PM', role: 'Room Attendant', dept: 'Housekeeping', status: 'PUBLISHED' },
  ]

  return (
    <AppLayout
      pageTitle="My Shift Schedule"
      pageDescription="Confirmed shifts, rest periods, and weekly hours allocation."
    >
      <div className="single-stack">
        <Panel
          title="My Scheduled Shifts This Week"
          subtitle="Published hotel roster shifts"
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shift Timing</th>
                  <th>Department & Role</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleShifts.map((s) => (
                  <tr key={s.id}>
                    <td><b>{fmtDate(s.date, { weekday: 'short', month: 'short', day: 'numeric' })}</b></td>
                    <td>{s.times}</td>
                    <td>{s.dept} · {s.role}</td>
                    <td>8.0 hours</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}
