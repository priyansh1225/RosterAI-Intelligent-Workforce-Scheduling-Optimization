import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  CalendarDays,
  DoorOpen,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Activity,
  ListChecks,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Plus,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { AppLayout } from '../components/AppLayout'
import { StatCard, Panel, StatusBadge, EmptyState } from '../components/Common'
import { fmtDate, timeOf, initials } from '../services/api'
import { operationsStore } from '../services/operationsStore'

export function HousekeepingDashboard() {
  const { data, tasks, requests, rooms, refreshOps } = useData()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState('')

  const hkStaff = data.employees.filter(
    (e) => e.department_name?.toLowerCase() === 'housekeeping'
  )
  const hkTasks = tasks.filter((t) => t.department?.toLowerCase() === 'housekeeping')
  const hkRequests = requests.filter((r) => r.department?.toLowerCase() === 'housekeeping')

  // Floor stats
  const floor1Rooms = rooms.filter((r) => r.floor === 1)
  const floor2Rooms = rooms.filter((r) => r.floor === 2)
  const floor3Rooms = rooms.filter((r) => r.floor === 3)

  const awaitingVerification = hkTasks.filter(
    (t) => t.status === 'SUBMITTED_FOR_VERIFICATION'
  )

  const handleVerify = (taskId) => {
    operationsStore.updateTaskStatus(
      taskId,
      'VERIFIED_COMPLETED',
      'Housekeeping Supervisor',
      'Room passed turnover inspection.'
    )
    refreshOps()
    setFeedback(`Task ${taskId} verified as completed! Room status updated.`)
    setTimeout(() => setFeedback(''), 4000)
  }

  return (
    <AppLayout
      pageTitle="Housekeeping Operations Hub"
      pageDescription="Floor-wise room turnover, housekeeper assignments, readiness verification, and operational requests."
      actions={
        <div className="action-buttons">
          <button
            className="button button-quiet"
            onClick={() => navigate('/housekeeping/requests')}
          >
            <Activity size={15} /> Request Staff
          </button>
          <button
            className="button button-primary"
            onClick={() => navigate('/housekeeping/room-readiness')}
          >
            <DoorOpen size={15} /> Room Readiness Flow
          </button>
        </div>
      }
    >
      {feedback && (
        <div className="toast-banner success">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>×</button>
        </div>
      )}

      {/* KPI STATS */}
      <div className="stats-grid">
        <StatCard
          label="Housekeeping Staff"
          value={hkStaff.length}
          foot="Department employees"
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Turnover Tasks"
          value={hkTasks.filter((t) => t.status === 'IN_PROGRESS').length}
          foot="Currently cleaning"
          icon={ListChecks}
          tone="violet"
        />
        <StatCard
          label="Awaiting Inspection"
          value={awaitingVerification.length}
          foot="Pending supervisor check"
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Rooms Verified Ready"
          value={rooms.filter((r) => r.status === 'ROOM_READY').length}
          foot={`of ${rooms.length} monitored rooms`}
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      <div className="bento-grid">
        {/* FLOOR-WISE ROOM STATUS (span-8) */}
        <Panel
          title="Floor-Wise Room Turnover Status"
          subtitle="Real-time cleanliness & room preparation status"
          className="span-8"
          action={
            <Link to="/housekeeping/floors" className="text-action">
              View Floors <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="rooms-grid">
            {rooms.slice(0, 6).map((rm) => (
              <div key={rm.room_number} className={`room-card status-${rm.status.toLowerCase()}`}>
                <div className="room-head">
                  <b>Room {rm.room_number}</b>
                  <span className="room-type">{rm.type}</span>
                </div>
                <div className="room-assignee">
                  <span>Assigned:</span> <b>{rm.assigned_to || 'Unassigned'}</b>
                </div>
                <div className="room-foot">
                  <StatusBadge status={rm.status} />
                  <small>Floor {rm.floor}</small>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* TASKS AWAITING INSPECTION (span-4) */}
        <Panel
          title="Tasks Awaiting Inspection"
          subtitle="Submitted by room attendants"
          className="span-4"
        >
          {awaitingVerification.length > 0 ? (
            <div className="awaiting-list">
              {awaitingVerification.map((t) => (
                <div key={t.id} className="awaiting-card">
                  <div className="awaiting-head">
                    <b>{t.title}</b>
                    <small>{t.location}</small>
                  </div>
                  <div className="awaiting-meta">
                    <span>By: {t.assigned_to}</span>
                    <span>Due: {timeOf(t.deadline)}</span>
                  </div>
                  <button
                    className="button button-small button-success full-button"
                    onClick={() => handleVerify(t.id)}
                  >
                    <CheckCircle2 size={13} /> Verify & Approve
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tasks awaiting verification"
              description="Room cleanings submitted by staff will appear here for inspection."
              icon={CheckCircle2}
            />
          )}
        </Panel>

        {/* HOUSEKEEPING TEAM (span-7) */}
        <Panel
          title="Department Team & Availability"
          subtitle="Qualified housekeepers on today's roster"
          className="span-7"
          action={
            <Link to="/housekeeping/staff" className="text-action">
              All Staff <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="leave-list">
            {hkStaff.map((p) => (
              <div key={p.id} className="leave-row">
                <div className="avatar avatar-soft">{initials(p.full_name)}</div>
                <div>
                  <b>{p.full_name}</b>
                  <small>
                    {p.employee_code} · Skills: {(p.skills || []).join(', ') || 'Room cleaning'}
                  </small>
                </div>
                <StatusBadge status={p.is_available ? 'AVAILABLE' : 'UNAVAILABLE'} />
              </div>
            ))}
          </div>
        </Panel>

        {/* ACTIVE STAFF REQUESTS (span-5) */}
        <Panel
          title="Recent Staff Requests"
          subtitle="Automatic allocation for floor turnover"
          className="span-5"
          action={
            <Link to="/housekeeping/requests" className="text-action">
              Manage Requests <ArrowRight size={14} />
            </Link>
          }
        >
          {hkRequests.length > 0 ? (
            <div className="leave-list">
              {hkRequests.slice(0, 3).map((r) => (
                <div key={r.id} className="leave-row">
                  <div>
                    <b>{r.task_type}</b>
                    <small>
                      {r.location} · {r.assigned_count}/{r.required_count} assigned
                    </small>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recent requests"
              description="Floor supervisors can request extra staff anytime."
              icon={Activity}
            />
          )}
        </Panel>
      </div>
    </AppLayout>
  )
}

export function HousekeepingFloorsPage() {
  const { rooms } = useData()

  const floors = [1, 2, 3]

  return (
    <AppLayout
      pageTitle="Housekeeping Floor Operations"
      pageDescription="Floor-by-floor breakdown of room inventory, cleaning status, and turnover priorities."
    >
      <div className="single-stack">
        {floors.map((fl) => {
          const flRooms = rooms.filter((r) => r.floor === fl)
          const readyCount = flRooms.filter((r) => r.status === 'ROOM_READY').length
          return (
            <Panel
              key={fl}
              title={`Floor ${fl} Inventory & Status`}
              subtitle={`${readyCount} of ${flRooms.length} rooms verified ready`}
            >
              <div className="rooms-grid">
                {flRooms.map((rm) => (
                  <div key={rm.room_number} className={`room-card status-${rm.status.toLowerCase()}`}>
                    <div className="room-head">
                      <b>Room {rm.room_number}</b>
                      <span className="room-type">{rm.type}</span>
                    </div>
                    <div className="room-assignee">
                      <span>Attendant:</span> <b>{rm.assigned_to || 'Unassigned'}</b>
                    </div>
                    <div className="room-foot">
                      <StatusBadge status={rm.status} />
                      <small>Inspected: {rm.last_inspected}</small>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )
        })}
      </div>
    </AppLayout>
  )
}

export function RoomReadinessPage() {
  const { rooms, refreshOps } = useData()
  const [feedback, setFeedback] = useState('')

  const stages = [
    { num: 1, title: 'Request Created', desc: 'Front Desk dispatches room turnover' },
    { num: 2, title: 'Staff Assigned', desc: 'Eligible housekeeper auto-allocated' },
    { num: 3, title: 'In Progress', desc: 'Cleaning and amenities restocked' },
    { num: 4, title: 'Awaiting Verification', desc: 'Attendant submits for inspection' },
    { num: 5, title: 'Room Ready', desc: 'Supervisor inspects and marks ready' },
  ]

  const handleVerifyRoom = (roomNum) => {
    operationsStore.updateRoom(roomNum, {
      status: 'ROOM_READY',
      last_inspected: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })
    refreshOps()
    setFeedback(`Room ${roomNum} marked as ROOM READY!`)
    setTimeout(() => setFeedback(''), 4000)
  }

  return (
    <AppLayout
      pageTitle="Room Readiness Verification Workflow"
      pageDescription="A room is ready ONLY after authorized supervisor verification. Front Desk cannot mark ready unilaterally."
    >
      {feedback && (
        <div className="toast-banner success">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>×</button>
        </div>
      )}

      {/* 5-STAGE WORKFLOW PIPELINE */}
      <div className="bento-grid">
        <Panel
          title="Mandatory Room Readiness Lifecycle"
          subtitle="Enforced operational process prevents premature guest check-in"
          className="span-12"
        >
          <div className="readiness-flow">
            {stages.map((st, idx) => (
              <div key={st.title} className="readiness-step">
                <span className={`step-number ${st.num === 5 ? 'step-complete' : ''}`}>
                  {st.num}
                </span>
                <div>
                  <b>{st.title}</b>
                  <small>{st.desc}</small>
                </div>
                {idx < stages.length - 1 && <ArrowRight size={15} color="#9aa5b7" />}
              </div>
            ))}
          </div>
        </Panel>

        {/* CURRENT MONITORED ROOMS */}
        <Panel
          title="Current Monitored Rooms"
          subtitle="Real-time verification states"
          className="span-12"
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Room Number</th>
                  <th>Floor</th>
                  <th>Room Category</th>
                  <th>Assigned Housekeeper</th>
                  <th>Last Inspected</th>
                  <th>Readiness State</th>
                  <th>Supervisor Sign-off</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((rm) => (
                  <tr key={rm.room_number}>
                    <td><b>Room {rm.room_number}</b></td>
                    <td>Floor {rm.floor}</td>
                    <td>{rm.type}</td>
                    <td>{rm.assigned_to || 'None'}</td>
                    <td>{rm.last_inspected}</td>
                    <td>
                      <StatusBadge status={rm.status} />
                    </td>
                    <td>
                      {rm.status === 'AWAITING_VERIFICATION' ? (
                        <button
                          className="button button-small button-success"
                          onClick={() => handleVerifyRoom(rm.room_number)}
                        >
                          <CheckCircle2 size={13} /> Verify Room Ready
                        </button>
                      ) : rm.status === 'ROOM_READY' ? (
                        <span className="verified-text">
                          <CheckCircle2 size={13} color="#16865c" /> Verified
                        </span>
                      ) : (
                        <span className="pending-text">In Progress</span>
                      )}
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
