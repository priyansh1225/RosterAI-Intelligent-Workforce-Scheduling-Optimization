
import React from 'react'
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
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'

import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import {
  StatCard,
  Panel,
  StatusBadge,
  EmptyState,
} from '../components/Common'
import { fmtDate, timeOf, initials } from '../services/api'

export function AdminDashboard() {
  const { data = {}, states, tasks = [], requests = [], reload } = useData()
  const { staffSession } = useAuth()
  const navigate = useNavigate()

  // Safely normalize collections that may not have loaded yet.
  const employees = Array.isArray(data.employees) ? data.employees : []
  const rosters = Array.isArray(data.rosters) ? data.rosters : []
  const occupancy = Array.isArray(data.occupancy) ? data.occupancy : []
  const leave = Array.isArray(data.leave) ? data.leave : []
  const weeklyShifts = Array.isArray(data.weeklyShifts)
    ? data.weeklyShifts
    : []
  const taskList = Array.isArray(tasks) ? tasks : []
  const requestList = Array.isArray(requests) ? requests : []

  const activeEmployees = employees.filter(
    (employee) => employee.employment_status === 'ACTIVE'
  )

  const activeRoster = rosters[0]

  const today = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const currentOcc = occupancy.find((row) => row.date === today)

  // Dashboard metrics
  const totalActive = activeEmployees.length

  const onDutyCount =
    activeRoster?.shifts?.length || weeklyShifts.length || 0

  const activeTasksCount = taskList.filter((task) =>
    ['ASSIGNED', 'IN_PROGRESS', 'ACCEPTED'].includes(task.status)
  ).length

  const pendingRequestsCount = requestList.filter((request) =>
    ['PARTIAL', 'SHORTAGE', 'REQUEST_CREATED'].includes(request.status)
  ).length

  const pendingLeaveCount = leave.filter(
    (item) => item.status === 'PENDING'
  ).length

  const awaitingVerificationCount = taskList.filter(
    (task) => task.status === 'SUBMITTED_FOR_VERIFICATION'
  ).length

  const departments = Array.isArray(data.demand?.departments)
    ? data.demand.departments
    : []

  const totalShortages = departments.reduce(
    (sum, department) => sum + (department.shortage || 0),
    0
  )

  const occupancyRate =
    currentOcc?.occupancy_rate ??
    data.demand?.occupancy?.occupancy_rate_percent ??
    85

  const occupiedRooms = currentOcc?.occupied_rooms ?? 170
  const totalRooms = currentOcc?.total_rooms ?? 200
  const expectedCheckIns = currentOcc?.expected_check_ins ?? 42
  const expectedCheckOuts = currentOcc?.expected_check_outs ?? 38

  return (
    <AppLayout
      pageTitle="Hotel Operations Dashboard"
      pageDescription="Central workforce coordination, department staffing requirements, and live roster status."
      actions={
        <div className="action-buttons">
          <button className="button button-quiet" onClick={reload}>
            <Activity size={15} /> Refresh Data
          </button>

          <button
            className="button button-primary"
            onClick={() => navigate('/admin/rosters/suggestions')}
          >
            <Sparkles size={15} /> AI Suggestions
          </button>
        </div>
      }
    >
      {/* SUMMARY CARDS */}
      <div className="stats-grid stats-grid-8">
        <StatCard
          label="Active Workforce"
          value={totalActive}
          foot="Employees in system"
          icon={Users}
          tone="blue"
        />

        <StatCard
          label="Scheduled on Shift"
          value={onDutyCount}
          foot="Shifts assigned today"
          icon={CalendarDays}
          tone="violet"
        />

        <StatCard
          label="Occupancy Rate"
          value={`${occupancyRate}%`}
          foot={`${occupiedRooms}/${totalRooms} rooms`}
          icon={DoorOpen}
          tone="amber"
        />

        <StatCard
          label="Staffing Shortage"
          value={totalShortages}
          foot="Across configured depts"
          icon={AlertTriangle}
          tone="rose"
        />

        <StatCard
          label="Active Operations Tasks"
          value={activeTasksCount}
          foot="Currently in progress"
          icon={ListChecks}
          tone="blue"
        />

        <StatCard
          label="Pending Staff Requests"
          value={pendingRequestsCount}
          foot="Supervisor requests"
          icon={Activity}
          tone="amber"
        />

        <StatCard
          label="Pending Leave Approvals"
          value={pendingLeaveCount}
          foot="Awaiting manager review"
          icon={Clock}
          tone="violet"
        />

        <StatCard
          label="Awaiting Verification"
          value={awaitingVerificationCount}
          foot="Submitted by employees"
          icon={ShieldCheck}
          tone="rose"
        />
      </div>

      {/* DASHBOARD GRID */}
      <div className="bento-grid">
        {/* WEEKLY ROSTER */}
        <Panel
          title="Weekly Roster & Coverage"
          subtitle="Assigned shifts across hotel departments"
          className="span-8"
          action={
            <Link to="/admin/rosters" className="text-action">
              View All Rosters <ArrowRight size={14} />
            </Link>
          }
        >
          {weeklyShifts.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Shift Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {weeklyShifts.slice(0, 5).map((shift) => (
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

                      <td>{shift.department_name || 'Department'}</td>
                      <td>{fmtDate(shift.start_at)}</td>
                      <td>
                        {timeOf(shift.start_at)} – {timeOf(shift.end_at)}
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
              title="No weekly shifts returned yet"
              description="Generate a draft roster or verify shift schedules."
              icon={CalendarDays}
            />
          )}

          {activeRoster && (
            <div className="panel-foot">
              <span>
                Roster #{activeRoster.id} ({fmtDate(activeRoster.date)})
              </span>
              <StatusBadge status={activeRoster.status} />
              <span className="foot-spacer" />
              <span>{activeRoster.shifts?.length || 0} shifts assigned</span>
            </div>
          )}
        </Panel>

        {/* OCCUPANCY AND DEMAND */}
        <Panel
          title="Occupancy & Staff Demand"
          subtitle="Rule-based hotel demand ratios"
          className="span-4"
          action={
            <Link
              to="/admin/occupancy"
              className="icon-button"
              aria-label="Open Demand"
            >
              <ArrowRight size={16} />
            </Link>
          }
        >
          <div className="occupancy-ring" style={{ '--progress': '85%' }}>
            <div>
              <b>{occupancyRate}%</b>
              <small>Occupancy</small>
            </div>
          </div>

          <div className="occupancy-meta">
            <span>
              {occupiedRooms} / {totalRooms} Rooms Booked
            </span>
            <span>
              {expectedCheckIns} Expected Check-ins · {expectedCheckOuts}{' '}
              Check-outs
            </span>
          </div>

          <div className="rule-caption">
            <Sparkles size={14} /> Deterministic Demand Ratios
          </div>
        </Panel>

        {/* DEPARTMENT COVERAGE */}
        <Panel
          title="Weekly Department Overview"
          subtitle="Staffing requirement vs scheduled headcount"
          className="span-7"
          action={
            <Link to="/admin/departments" className="text-action">
              All Departments <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="coverage-list">
            {(departments.length > 0
              ? departments
              : [
                  {
                    department: 'Housekeeping',
                    department_id: 1,
                    required_staff: 8,
                    scheduled_staff: 6,
                    shortage: 2,
                  },
                  {
                    department: 'Front Desk',
                    department_id: 2,
                    required_staff: 4,
                    scheduled_staff: 4,
                    shortage: 0,
                  },
                  {
                    department: 'Food & Beverage',
                    department_id: 3,
                    required_staff: 6,
                    scheduled_staff: 5,
                    shortage: 1,
                  },
                  {
                    department: 'Kitchen',
                    department_id: 4,
                    required_staff: 5,
                    scheduled_staff: 5,
                    shortage: 0,
                  },
                ]
            ).map((department) => (
              <div
                className="coverage-row"
                key={department.department_id || department.department}
              >
                <div className="dept-mark">
                  {initials(department.department)}
                </div>

                <b>{department.department}</b>

                <div className="coverage-meter">
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        (department.scheduled_staff /
                          (department.required_staff || 1)) *
                          100
                      )}%`,
                    }}
                  />
                </div>

                <span>
                  {department.scheduled_staff}{' '}
                  <small>/ {department.required_staff} required</small>
                </span>

                <StatusBadge
                  status={department.shortage > 0 ? 'SHORTAGE' : 'COVERED'}
                />
              </div>
            ))}
          </div>
        </Panel>

        {/* PENDING LEAVE */}
        <Panel
          title="Pending Leave Queue"
          subtitle="Requests requiring management decision"
          className="span-5"
          action={
            <Link to="/admin/leave-requests" className="text-action">
              Review Queue <ArrowRight size={14} />
            </Link>
          }
        >
          {leave.length > 0 ? (
            <div className="leave-list">
              {leave.slice(0, 4).map((item) => (
                <div className="leave-row" key={item.id}>
                  <div className="avatar avatar-soft">
                    {initials(item.employee_name)}
                  </div>

                  <div>
                    <b>{item.employee_name}</b>
                    <small>
                      {fmtDate(item.start_date)} – {fmtDate(item.end_date)}
                    </small>
                  </div>

                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No pending leave requests"
              description="All submitted leave requests have been reviewed."
              icon={CheckCircle2}
            />
          )}
        </Panel>

        {/* ACTIVE TASKS */}
        <Panel
          title="Active Operational Tasks & Deadlines"
          subtitle="Real-time task progression across hotel areas"
          className="span-12"
          action={
            <Link to="/admin/tasks" className="text-action">
              Manage Tasks <ArrowRight size={14} />
            </Link>
          }
        >
          {taskList.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Task Title</th>
                    <th>Department</th>
                    <th>Location</th>
                    <th>Assigned Staff</th>
                    <th>Deadline</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {taskList.slice(0, 4).map((task) => (
                    <tr key={task.id}>
                      <td>
                        <b>{task.task_code || task.id}</b>
                      </td>
                      <td>{task.title}</td>
                      <td>{task.department}</td>
                      <td>{task.location || '—'}</td>
                      <td>{task.assigned_to || 'Unassigned'}</td>
                      <td>{timeOf(task.deadline)}</td>
                      <td>
                        <StatusBadge status={task.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No operational tasks yet"
              description="Tasks will appear here once they are loaded from the task service."
              icon={ListChecks}
            />
          )}
        </Panel>
      </div>
    </AppLayout>
  )
}
