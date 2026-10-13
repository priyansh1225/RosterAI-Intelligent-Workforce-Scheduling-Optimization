import React, { useState, useEffect } from 'react'
import {
  FileBarChart2,
  CalendarDays,
  Clock,
  Users,
  DoorOpen,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { AppLayout } from '../components/AppLayout'
import { Panel, StatCard, EmptyState, StatusBadge } from '../components/Common'
import { api, listData, fmtDate, timeOf } from '../services/api'

export function ReportsPage() {
  const { data } = useData()
  const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

  const addDays = (d, n) => {
    const res = new Date(`${d}T12:00:00`)
    res.setDate(res.getDate() + n)
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(res)
  }

  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(addDays(today, 6))
  const [departmentId, setDepartmentId] = useState('')
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    if (!startDate || !endDate || endDate < startDate) return

    setLoading(true)
    const deptQuery = departmentId ? `&department=${departmentId}` : ''
    api(`/shifts/weekly/?date=${startDate}${deptQuery}`)
      .then((res) => {
        if (!live) return
        const list = listData(res).filter((s) => {
          const shiftDate = s.start_at.slice(0, 10)
          return shiftDate >= startDate && shiftDate <= endDate
        })
        setShifts(list)
        setError('')
      })
      .catch((err) => {
        if (live) setError(err.message)
      })
      .finally(() => {
        if (live) setLoading(false)
      })

    return () => {
      live = false
    }
  }, [startDate, endDate, departmentId])

  const totalHours = shifts.reduce((acc, s) => {
    const diff = (new Date(s.end_at) - new Date(s.start_at)) / 3600000
    return acc + (isNaN(diff) ? 0 : diff)
  }, 0)

  return (
    <AppLayout
      pageTitle="Workforce Reports & Operational Analytics"
      pageDescription="Comprehensive reports derived directly from scheduled shifts, occupancy records, and department workloads."
    >
      {/* FILTER BAR */}
      <div className="toolbar report-toolbar">
        <div className="filter-group">
          <label>From Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Through Date:</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Department Filter:</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">All Departments</option>
            {data.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI STAT CARDS */}
      <div className="stats-grid">
        <StatCard
          label="Filtered Shifts"
          value={loading ? '…' : shifts.length}
          foot="Within selected date range"
          icon={CalendarDays}
          tone="violet"
        />
        <StatCard
          label="Total Scheduled Hours"
          value={loading ? '…' : `${totalHours.toFixed(1)} hrs`}
          foot="Sum of assigned shift hours"
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Active Staff In System"
          value={data.employees.length}
          foot="Total workforce records"
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Occupancy Snapshots"
          value={data.occupancy.length}
          foot="Recorded hotel snapshots"
          icon={DoorOpen}
          tone="rose"
        />
      </div>

      {/* REPORT CONTENT */}
      <div className="bento-grid">
        <Panel
          title="Scheduled Shift Records"
          subtitle="Shifts loaded from live /shifts/weekly/ endpoint"
          className="span-8"
        >
          {loading ? (
            <div className="empty-inline">Fetching shift records...</div>
          ) : shifts.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <b>{s.employee_name || 'Staff Member'}</b>
                      </td>
                      <td>{s.department_name}</td>
                      <td>{fmtDate(s.start_at)}</td>
                      <td>
                        {timeOf(s.start_at)} – {timeOf(s.end_at)}
                      </td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No shifts found for this selection"
              description="Try expanding your date range or selecting another department."
              icon={FileBarChart2}
            />
          )}
        </Panel>

        {/* METRICS & BREAKDOWNS (span-4) */}
        <Panel
          title="Reporting Metrics Status"
          subtitle="Data source verification"
          className="span-4"
        >
          <div className="report-metric-rows">
            <div className="metric-row">
              <b>Department Demand</b>
              <span>{data.demand ? 'Active (Live)' : 'Rule Calculated'}</span>
              <small>forecasting.StaffingRule</small>
            </div>
            <div className="metric-row">
              <b>Room Occupancy</b>
              <span>{data.occupancy.length} Recorded Snapshots</span>
              <small>occupancy.OccupancyRecord</small>
            </div>
            <div className="metric-row">
              <b>Overtime Tracking</b>
              <span>Standard 40h Weekly Caps</span>
              <small>Hard constraint applied</small>
            </div>
            <div className="metric-row">
              <b>Leave Conflicts</b>
              <span>{data.leave.length} Requests Evaluated</span>
              <small>Pre-filtered during allocation</small>
            </div>
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}
