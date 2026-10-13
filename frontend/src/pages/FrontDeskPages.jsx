import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DoorOpen,
  CalendarDays,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
  ListChecks,
  Activity,
  Users,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { AppLayout } from '../components/AppLayout'
import { StatCard, Panel, StatusBadge, EmptyState } from '../components/Common'
import { operationsStore } from '../services/operationsStore'
import { timeOf } from '../services/api'

export function FrontDeskDashboard() {
  const { rooms, tasks, requests } = useData()
  const navigate = useNavigate()

  const readyRooms = rooms.filter((r) => r.status === 'ROOM_READY')
  const inProgressRooms = rooms.filter((r) =>
    ['IN_PROGRESS', 'STAFF_ASSIGNED', 'REQUEST_CREATED'].includes(r.status)
  )
  const awaitingInspection = rooms.filter((r) => r.status === 'AWAITING_VERIFICATION')

  return (
    <AppLayout
      pageTitle="Front Desk Workspace"
      pageDescription="Monitor guest room readiness, request rapid turnovers, and coordinate arrivals with Housekeeping."
      actions={
        <button
          className="button button-primary"
          onClick={() => navigate('/front-desk/room-requests')}
        >
          <Plus size={15} /> Request Room Preparation
        </button>
      }
    >
      {/* 4 KPI CARDS */}
      <div className="stats-grid">
        <StatCard
          label="Rooms Verified Ready"
          value={readyRooms.length}
          foot="Available for check-in"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Turnovers In Progress"
          value={inProgressRooms.length}
          foot="Housekeeping assigned"
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Awaiting Inspection"
          value={awaitingInspection.length}
          foot="Pending supervisor sign-off"
          icon={AlertTriangle}
          tone="violet"
        />
        <StatCard
          label="Total Monitored Rooms"
          value={rooms.length}
          foot="Active hotel keys"
          icon={DoorOpen}
          tone="blue"
        />
      </div>

      <div className="bento-grid">
        {/* ROOM READINESS BOARD (span-8) */}
        <Panel
          title="Live Room Readiness Overview"
          subtitle="Front desk cannot check in guests until status is 'Room Ready'"
          className="span-8"
          action={
            <Link to="/front-desk/room-status" className="text-action">
              Detailed Status <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="rooms-grid">
            {rooms.slice(0, 8).map((rm) => (
              <div
                key={rm.room_number}
                className={`room-card status-${rm.status.toLowerCase()}`}
              >
                <div className="room-head">
                  <b>Room {rm.room_number}</b>
                  <span className="room-type">{rm.type}</span>
                </div>
                <div className="room-assignee">
                  <span>Assigned:</span> <b>{rm.assigned_to || 'Pending'}</b>
                </div>
                <div className="room-foot">
                  <StatusBadge status={rm.status} />
                  <small>Floor {rm.floor}</small>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* QUICK REQUEST (span-4) */}
        <Panel
          title="Front Desk Actions"
          subtitle="Direct links to operations"
          className="span-4"
        >
          <div className="department-links">
            <Link to="/front-desk/room-requests">
              <span>Request Priority Room Preparation</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/front-desk/room-status">
              <span>Inspect All Room Cleaning Progress</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/front-desk/tasks">
              <span>Front Desk Shift Tasks</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="notice-panel">
            <Clock size={16} />
            <p>
              Arrival priority? Submit a room request with "Urgent" priority to auto-assign the nearest available housekeeper.
            </p>
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}

export function FrontDeskRoomRequestsPage() {
  const { data, refreshOps } = useData()
  const [feedback, setFeedback] = useState('')

  const [form, setForm] = useState({
    room_number: '204',
    guest_name: 'VIP Guest Arrival',
    priority: 'URGENT',
    special_notes: 'Early check-in requested at 13:00. Extra feather pillows required.',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    try {
      const created = operationsStore.createRequest(
        {
          department: 'Housekeeping',
          location: `Room ${form.room_number}`,
          task_type: 'Priority Room Preparation',
          required_count: 1,
          required_skills: ['Room cleaning'],
          priority: form.priority,
          duration_minutes: 45,
          deadline: new Date(Date.now() + 45 * 60000).toISOString(),
          reason: `${form.guest_name}: ${form.special_notes}`,
        },
        data.employees
      )

      // Also ensure room status reflects requested
      operationsStore.updateRoom(form.room_number, {
        status: created.assigned_count > 0 ? 'STAFF_ASSIGNED' : 'REQUEST_CREATED',
        assigned_to: created.assigned_staff?.[0] || null,
      })

      refreshOps()
      setFeedback(
        `Room ${form.room_number} preparation requested! ${created.assigned_count > 0 ? `Housekeeper ${created.assigned_staff[0]} auto-allocated.` : 'Queued for next available housekeeper.'}`
      )
      setTimeout(() => setFeedback(''), 5000)
    } catch (err) {
      setFeedback(`Error: ${err.message}`)
    }
  }

  return (
    <AppLayout
      pageTitle="Front Desk Room Preparation Requests"
      pageDescription="Dispatch expedited room cleaning to Housekeeping for early check-ins and VIP arrivals."
    >
      {feedback && (
        <div className="toast-banner success">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>×</button>
        </div>
      )}

      <div className="bento-grid">
        <Panel
          title="New Room Preparation Dispatch"
          subtitle="Direct integration with Housekeeping task allocation"
          className="span-6"
        >
          <form className="compact-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Room Number
                <input
                  required
                  type="text"
                  value={form.room_number}
                  onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                  placeholder="e.g. 104, 204"
                />
              </label>
              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="NORMAL">Standard Check-in</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent VIP Arrival</option>
                </select>
              </label>
            </div>

            <label>
              Guest Name / Reservation Reference
              <input
                required
                type="text"
                value={form.guest_name}
                onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                placeholder="e.g. Dr. A. Vance (Res #8841)"
              />
            </label>

            <label>
              Special Amenities & Instructions
              <textarea
                rows="3"
                value={form.special_notes}
                onChange={(e) => setForm({ ...form, special_notes: e.target.value })}
                placeholder="Baby cot, allergen-free bedding, welcome fruit basket..."
              />
            </label>

            <button type="submit" className="button button-primary full-button">
              Dispatch to Housekeeping
            </button>
          </form>
        </Panel>

        <Panel
          title="Front Desk Communication Safeguard"
          subtitle="Standard operating procedure"
          className="span-6"
        >
          <div className="notice-banner-content">
            <DoorOpen size={24} color="#315efb" />
            <div>
              <b>Mandatory Room Readiness Rule:</b>
              <p>
                Front Desk personnel cannot mark a room ready simply because the request was sent.
                The room remains unassignable in the PMS until a Housekeeping Supervisor conducts physical inspection
                and submits official verification.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}
