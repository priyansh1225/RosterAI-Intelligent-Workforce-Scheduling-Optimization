
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  DoorOpen,
  ArrowRight,
  Activity,
  ListChecks,
  CheckCircle2,
  Clock,
} from 'lucide-react'

import { useData } from '../context/DataContext'
import { AppLayout } from '../components/AppLayout'
import {
  StatCard,
  Panel,
  StatusBadge,
  EmptyState,
} from '../components/Common'
import { api, timeOf, initials } from '../services/api'
import { operationsStore } from '../services/operationsStore'

export function HousekeepingDashboard() {
  const { data, tasks, requests, rooms, refreshOps } = useData()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState('')

  const hkStaff = data.employees.filter(
    (employee) =>
      employee.department_name?.toLowerCase() === 'housekeeping'
  )

  const hkTasks = tasks.filter(
    (task) => task.department?.toLowerCase() === 'housekeeping'
  )

  const hkRequests = requests.filter(
    (request) =>
      (
        request.department_name ||
        (typeof request.department === 'string'
          ? request.department
          : '')
      ).toLowerCase() === 'housekeeping'
  )

  const awaitingVerification = hkTasks.filter(
    (task) => task.status === 'SUBMITTED_FOR_VERIFICATION'
  )

  const handleVerify = (taskId) => {
    operationsStore.updateTaskStatus(
      taskId,
      'VERIFIED_COMPLETED',
      'Housekeeping Supervisor',
      'Room passed turnover inspection.'
    )

    refreshOps()
    setFeedback(`Task ${taskId} verified as completed!`)
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
          value={
            hkTasks.filter((task) => task.status === 'IN_PROGRESS')
              .length
          }
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
          value={
            rooms.filter((room) => room.status === 'ROOM_READY')
              .length
          }
          foot={`of ${rooms.length} monitored rooms`}
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      <div className="bento-grid">
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
            {rooms.slice(0, 6).map((room) => (
              <div
                key={room.id ?? room.room_number}
                className={`room-card status-${room.status.toLowerCase()}`}
              >
                <div className="room-head">
                  <b>Room {room.room_number}</b>
                  <span className="room-type">
                    {room.room_type || room.type || 'Standard'}
                  </span>
                </div>

                <div className="room-assignee">
                  <span>Assigned:</span>{' '}
                  <b>{room.assigned_to || 'Unassigned'}</b>
                </div>

                <div className="room-foot">
                  <StatusBadge status={room.status} />
                  <small>Floor {room.floor}</small>
                </div>
              </div>
            ))}
          </div>

          {rooms.length === 0 && (
            <EmptyState
              title="No rooms available"
              description="Rooms from the database will appear here."
              icon={DoorOpen}
            />
          )}
        </Panel>

        <Panel
          title="Tasks Awaiting Inspection"
          subtitle="Submitted by room attendants"
          className="span-4"
        >
          {awaitingVerification.length > 0 ? (
            <div className="awaiting-list">
              {awaitingVerification.map((task) => (
                <div key={task.id} className="awaiting-card">
                  <div className="awaiting-head">
                    <b>{task.title}</b>
                    <small>{task.location}</small>
                  </div>

                  <div className="awaiting-meta">
                    <span>By: {task.assigned_to || 'Unassigned'}</span>
                    <span>Due: {timeOf(task.deadline)}</span>
                  </div>

                  <button
                    className="button button-small button-success full-button"
                    onClick={() => handleVerify(task.id)}
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
            {hkStaff.map((person) => (
              <div key={person.id} className="leave-row">
                <div className="avatar avatar-soft">
                  {initials(person.full_name)}
                </div>

                <div>
                  <b>{person.full_name}</b>
                  <small>
                    {person.employee_code} · Skills:{' '}
                    {(person.skills || []).join(', ') || 'Room cleaning'}
                  </small>
                </div>

                <StatusBadge
                  status={
                    person.is_available ? 'AVAILABLE' : 'UNAVAILABLE'
                  }
                />
              </div>
            ))}
          </div>

          {hkStaff.length === 0 && (
            <EmptyState
              title="No housekeeping staff found"
              description="Housekeeping employees will appear here when available in the database."
              icon={Users}
            />
          )}
        </Panel>

        <Panel
          title="Recent Staff Requests"
          subtitle="Staff allocation requests for floor turnover"
          className="span-5"
          action={
            <Link
              to="/housekeeping/requests"
              className="text-action"
            >
              Manage Requests <ArrowRight size={14} />
            </Link>
          }
        >
          {hkRequests.length > 0 ? (
            <div className="leave-list">
              {hkRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="leave-row">
                  <div>
                    <b>{request.task_type}</b>
                    <small>
                      {request.location} · {request.assigned_count}/
                      {request.required_count} assigned
                    </small>
                  </div>

                  <StatusBadge status={request.status} />
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
        {floors.map((floor) => {
          const floorRooms = rooms.filter(
            (room) => Number(room.floor) === floor
          )

          const readyCount = floorRooms.filter(
            (room) => room.status === 'ROOM_READY'
          ).length

          return (
            <Panel
              key={floor}
              title={`Floor ${floor} Inventory & Status`}
              subtitle={`${readyCount} of ${floorRooms.length} rooms verified ready`}
            >
              <div className="rooms-grid">
                {floorRooms.map((room) => (
                  <div
                    key={room.id ?? room.room_number}
                    className={`room-card status-${room.status.toLowerCase()}`}
                  >
                    <div className="room-head">
                      <b>Room {room.room_number}</b>
                      <span className="room-type">
                        {room.room_type || room.type || 'Standard'}
                      </span>
                    </div>

                    <div className="room-assignee">
                      <span>Attendant:</span>{' '}
                      <b>{room.assigned_to || 'Unassigned'}</b>
                    </div>

                    <div className="room-foot">
                      <StatusBadge status={room.status} />
                      <small>
                        Inspected: {room.last_inspected || 'None'}
                      </small>
                    </div>
                  </div>
                ))}
              </div>

              {floorRooms.length === 0 && (
                <EmptyState
                  title="No rooms on this floor"
                  description="Rooms assigned to this floor will appear here."
                  icon={DoorOpen}
                />
              )}
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
  const [verifyingRoomId, setVerifyingRoomId] = useState(null)

  const stages = [
    {
      num: 1,
      title: 'Request Created',
      desc: 'Front Desk dispatches room turnover',
    },
    {
      num: 2,
      title: 'Staff Assigned',
      desc: 'Eligible housekeeper allocated',
    },
    {
      num: 3,
      title: 'In Progress',
      desc: 'Cleaning and amenities restocked',
    },
    {
      num: 4,
      title: 'Awaiting Verification',
      desc: 'Attendant submits for inspection',
    },
    {
      num: 5,
      title: 'Room Ready',
      desc: 'Supervisor inspects and marks ready',
    },
  ]

  const handleVerifyRoom = async (room) => {
    setVerifyingRoomId(room.id)
    setFeedback('')

    try {
      const inspectedAt = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })

      await api(`/occupancy/rooms/${room.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'ROOM_READY',
          last_inspected: inspectedAt,
        }),
      })

      await refreshOps()
      setFeedback(`Room ${room.room_number} marked as ROOM READY!`)
    } catch (error) {
      console.error('Failed to verify room:', error)
      setFeedback(
        `Could not verify room ${room.room_number}. Please check the server and try again.`
      )
    } finally {
      setVerifyingRoomId(null)
      setTimeout(() => setFeedback(''), 4000)
    }
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

      <div className="bento-grid">
        <Panel
          title="Mandatory Room Readiness Lifecycle"
          subtitle="Operational process for room turnover and verification"
          className="span-12"
        >
          <div className="readiness-flow">
            {stages.map((stage, index) => (
              <div key={stage.title} className="readiness-step">
                <span
                  className={`step-number ${
                    stage.num === 5 ? 'step-complete' : ''
                  }`}
                >
                  {stage.num}
                </span>

                <div>
                  <b>{stage.title}</b>
                  <small>{stage.desc}</small>
                </div>

                {index < stages.length - 1 && (
                  <ArrowRight size={15} color="#9aa5b7" />
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Current Monitored Rooms"
          subtitle="Room status loaded from Django"
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
                {rooms.map((room) => (
                  <tr key={room.id ?? room.room_number}>
                    <td>
                      <b>Room {room.room_number}</b>
                    </td>
                    <td>Floor {room.floor}</td>
                    <td>{room.room_type || room.type || 'Standard'}</td>
                    <td>{room.assigned_to || 'None'}</td>
                    <td>{room.last_inspected || 'None'}</td>

                    <td>
                      <StatusBadge status={room.status} />
                    </td>

                    <td>
                      {room.status === 'AWAITING_VERIFICATION' ? (
                        <button
                          className="button button-small button-success"
                          disabled={verifyingRoomId === room.id}
                          onClick={() => handleVerifyRoom(room)}
                        >
                          {verifyingRoomId === room.id ? (
                            'Saving...'
                          ) : (
                            <>
                              <CheckCircle2 size={13} /> Verify Room Ready
                            </>
                          )}
                        </button>
                      ) : room.status === 'ROOM_READY' ? (
                        <span className="verified-text">
                          <CheckCircle2 size={13} color="#16865c" /> Verified
                        </span>
                      ) : (
                        <span className="pending-text">
                          In Progress
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rooms.length === 0 && (
            <EmptyState
              title="No rooms found"
              description="Create rooms through the Django Rooms API to see them here."
              icon={DoorOpen}
            />
          )}
        </Panel>
      </div>
    </AppLayout>
  )
}
