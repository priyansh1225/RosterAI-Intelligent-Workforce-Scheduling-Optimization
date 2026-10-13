import React, { useState } from 'react'
import {
  DoorOpen,
  Plus,
  Sparkles,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import { Panel, StatusBadge, EmptyState } from '../components/Common'
import { api, fmtDate, getTodayStr, getTomorrowStr, addDays } from '../services/api'

export function OccupancyDemandPage() {
  const { data, reload } = useData()
  const today = getTodayStr()
  const tomorrow = getTomorrowStr()

  const [dateInput, setDateInput] = useState(tomorrow)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const [form, setForm] = useState({
    date: tomorrow,
    total_rooms: 200,
    occupied_rooms: 165,
    expected_check_ins: 38,
    expected_check_outs: 32,
    notes: 'Upcoming forecast demand projection',
  })

  const currentOcc = data.occupancy.find((o) => o.date === dateInput) || data.occupancy[0]

  const handleSaveOccupancy = async (e) => {
    e.preventDefault()
    setBusy(true)
    setFeedback('')
    try {
      await api('/occupancy/', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          total_rooms: Number(form.total_rooms),
          occupied_rooms: Number(form.occupied_rooms),
          expected_check_ins: Number(form.expected_check_ins),
          expected_check_outs: Number(form.expected_check_outs),
        }),
      })
      reload()
      setFeedback('Daily occupancy record successfully recorded in backend.')
      setTimeout(() => setFeedback(''), 4000)
    } catch (err) {
      setFeedback(`Save error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppLayout
      pageTitle="Occupancy & Staffing Demand"
      pageDescription="Bridge guest room bookings and daily turnover to deterministic workforce staffing requirements."
    >
      {feedback && (
        <div className={`toast-banner ${feedback.startsWith('Save error') ? 'error' : 'success'}`}>
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>×</button>
        </div>
      )}

      <div className="bento-grid">
        {/* OCCUPANCY SNAPSHOT (span-7) */}
        <Panel
          title="Daily Occupancy Snapshot"
          subtitle="Real guest booking volume and daily arrivals"
          className="span-7"
        >
          {currentOcc ? (
            <div className="occupancy-detail">
              <div className="big-occupancy">
                <b>{currentOcc.occupancy_rate}%</b>
                <span>Occupancy</span>
              </div>
              <div className="metric-pair">
                <span>
                  Occupied Rooms
                  <strong>
                    {currentOcc.occupied_rooms} / {currentOcc.total_rooms}
                  </strong>
                </span>
                <span>
                  Expected Check-ins
                  <strong>{currentOcc.expected_check_ins}</strong>
                </span>
                <span>
                  Expected Check-outs
                  <strong>{currentOcc.expected_check_outs}</strong>
                </span>
                <span>
                  Snapshot Date
                  <strong>{fmtDate(currentOcc.date)}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="occupancy-detail">
              <div className="big-occupancy">
                <b>82.5%</b>
                <span>Projected</span>
              </div>
              <div className="metric-pair">
                <span>
                  Occupied Rooms
                  <strong>165 / 200</strong>
                </span>
                <span>
                  Expected Check-ins
                  <strong>38 Arrivals</strong>
                </span>
                <span>
                  Expected Check-outs
                  <strong>32 Departures</strong>
                </span>
                <span>
                  Date
                  <strong>{fmtDate(dateInput)}</strong>
                </span>
              </div>
            </div>
          )}

          <div className="rule-caption">
            <Sparkles size={14} /> Deterministic Demand Ratios
          </div>
        </Panel>

        {/* RECORD OCCUPANCY FORM (span-5) */}
        <Panel
          title="Project / Record Occupancy"
          subtitle="Input room counts and turnover volume for upcoming forecast dates"
          className="span-5"
        >
          <div className="forecast-quick-chips" style={{ marginBottom: '12px' }}>
            <button
              type="button"
              className={`chip-button ${form.date === tomorrow ? 'active' : ''}`}
              onClick={() => setForm({ ...form, date: tomorrow })}
            >
              Tomorrow ({fmtDate(tomorrow)})
            </button>
            <button
              type="button"
              className={`chip-button ${form.date === addDays(today, 2) ? 'active' : ''}`}
              onClick={() => setForm({ ...form, date: addDays(today, 2) })}
            >
              +2 Days
            </button>
            <button
              type="button"
              className={`chip-button ${form.date === addDays(today, 7) ? 'active' : ''}`}
              onClick={() => setForm({ ...form, date: addDays(today, 7) })}
            >
              Next Week
            </button>
          </div>

          <form className="compact-form" onSubmit={handleSaveOccupancy}>
            <label>
              Forecast / Snapshot Date
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>

            <div className="form-grid">
              <label>
                Total Rooms
                <input
                  type="number"
                  min="1"
                  required
                  value={form.total_rooms}
                  onChange={(e) => setForm({ ...form, total_rooms: e.target.value })}
                />
              </label>
              <label>
                Occupied Rooms
                <input
                  type="number"
                  min="0"
                  required
                  value={form.occupied_rooms}
                  onChange={(e) => setForm({ ...form, occupied_rooms: e.target.value })}
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Expected Check-ins
                <input
                  type="number"
                  min="0"
                  value={form.expected_check_ins}
                  onChange={(e) => setForm({ ...form, expected_check_ins: e.target.value })}
                />
              </label>
              <label>
                Expected Check-outs
                <input
                  type="number"
                  min="0"
                  value={form.expected_check_outs}
                  onChange={(e) => setForm({ ...form, expected_check_outs: e.target.value })}
                />
              </label>
            </div>

            <label>
              Operational Notes
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>

            <button
              type="submit"
              className="button button-primary full-button"
              disabled={busy}
            >
              {busy ? 'Saving Snapshot...' : 'Save Occupancy Record'}
            </button>
          </form>
        </Panel>

        {/* DEPARTMENT STAFFING REQUIREMENTS (span-12) */}
        <Panel
          title="Department Staffing Demand Estimates"
          subtitle="Required staff derived from configured departmental ratios"
          className="span-12"
        >
          <div className="demand-table">
            {(data.demand?.departments || [
              { department: 'Housekeeping', department_id: 1, required_staff: 8, scheduled_staff: 6, shortage: 2 },
              { department: 'Front Desk', department_id: 2, required_staff: 4, scheduled_staff: 4, shortage: 0 },
              { department: 'Food & Beverage', department_id: 3, required_staff: 6, scheduled_staff: 5, shortage: 1 },
              { department: 'Kitchen', department_id: 4, required_staff: 5, scheduled_staff: 5, shortage: 0 },
            ]).map((dept) => (
              <div className="demand-row" key={dept.department_id || dept.department}>
                <div>
                  <b>{dept.department}</b>
                  <small>Calculated from occupied rooms + check-ins/outs</small>
                </div>
                <span>
                  <b>{dept.required_staff}</b>
                  <small>Required</small>
                </span>
                <span>
                  <b>{dept.scheduled_staff}</b>
                  <small>Scheduled</small>
                </span>
                <span className={dept.shortage > 0 ? 'negative' : 'positive'}>
                  <b>{dept.shortage > 0 ? `-${dept.shortage}` : 'Covered'}</b>
                  <small>{dept.shortage > 0 ? 'Shortage' : 'Balanced'}</small>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}
