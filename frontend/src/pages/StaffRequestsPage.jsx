import React, { useState } from 'react'
import {
  Activity,
  Plus,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import { Panel, StatusBadge, EmptyState } from '../components/Common'
import { operationsStore } from '../services/operationsStore'
import { fmtDate, timeOf } from '../services/api'

export function StaffRequestsPage({ departmentScope }) {
  const { data, requests, refreshOps } = useData()
  const [showModal, setShowModal] = useState(false)
  const [feedback, setFeedback] = useState('')

  const [form, setForm] = useState({
    department: departmentScope || 'Housekeeping',
    location: '',
    task_type: 'Room Cleaning & Turnover',
    required_count: 2,
    required_skills: '',
    priority: 'HIGH',
    duration_minutes: 60,
    deadline: '',
    reason: '',
  })

  const filteredRequests = departmentScope
    ? requests.filter((r) => r.department?.toLowerCase() === departmentScope.toLowerCase())
    : requests

  const handleCreateRequest = (e) => {
    e.preventDefault()
    try {
      const skillsArray = form.required_skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const dl = form.deadline
        ? new Date(form.deadline).toISOString()
        : new Date(Date.now() + 60 * 60000).toISOString()

      const created = operationsStore.createRequest(
        {
          ...form,
          required_skills: skillsArray,
          deadline: dl,
        },
        data.employees
      )

      refreshOps()
      setShowModal(false)
      setForm({
        department: departmentScope || 'Housekeeping',
        location: '',
        task_type: 'Room Cleaning & Turnover',
        required_count: 2,
        required_skills: '',
        priority: 'HIGH',
        duration_minutes: 60,
        deadline: '',
        reason: '',
      })

      if (created.shortage === 0) {
        setFeedback(
          `Request ${created.id} fully allocated! ${created.assigned_count} qualified staff assigned automatically.`
        )
      } else {
        setFeedback(
          `Request ${created.id}: Allocated ${created.assigned_count} staff. ${created.shortage_reason}`
        )
      }
      setTimeout(() => setFeedback(''), 5000)
    } catch (err) {
      setFeedback(`Error: ${err.message}`)
    }
  }

  return (
    <AppLayout
      pageTitle={departmentScope ? `${departmentScope} Staff Requests` : 'Operational Staff Requests'}
      pageDescription="Supervisor staff request workflow with instant automatic allocation based on skills, shifts, and availability."
      actions={
        <button
          className="button button-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} /> New Staff Request
        </button>
      }
    >
      {feedback && (
        <div className={`toast-banner ${feedback.includes('Allocated') || feedback.includes('fully') ? 'success' : 'error'}`}>
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>×</button>
        </div>
      )}

      {/* AUTOMATIC ALLOCATION SUMMARY */}
      <div className="bento-grid">
        <Panel
          title="Automatic Staff Allocation Engine"
          subtitle="Real-time matching algorithm evaluates 7 hard operational constraints"
          className="span-12"
        >
          <div className="engine-steps-bar">
            <div className="engine-step">
              <span className="step-num">1</span>
              <div>
                <b>Supervisor Request</b>
                <small>Location, count & required skills</small>
              </div>
            </div>
            <ArrowRight size={16} color="#8a94a5" />
            <div className="engine-step">
              <span className="step-num">2</span>
              <div>
                <b>Eligibility Filtering</b>
                <small>Department, active shift & rest</small>
              </div>
            </div>
            <ArrowRight size={16} color="#8a94a5" />
            <div className="engine-step">
              <span className="step-num">3</span>
              <div>
                <b>Auto-Dispatch</b>
                <small>Assigned instantly to employee tasklist</small>
              </div>
            </div>
            <ArrowRight size={16} color="#8a94a5" />
            <div className="engine-step">
              <span className="step-num">4</span>
              <div>
                <b>Shortage Resolution</b>
                <small>Bottlenecks explained with no admin block</small>
              </div>
            </div>
          </div>
        </Panel>

        {/* REQUESTS LIST (span-12) */}
        <Panel
          title="Staffing Requests & Allocation Status"
          subtitle={`${filteredRequests.length} operational requests recorded`}
          className="span-12"
        >
          {filteredRequests.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Department & Location</th>
                    <th>Task Requirement</th>
                    <th>Headcount</th>
                    <th>Assigned Staff</th>
                    <th>Priority</th>
                    <th>Deadline</th>
                    <th>Allocation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req.id}>
                      <td><b>{req.id}</b></td>
                      <td>
                        <div className="person-cell">
                          <div>
                            <b>{req.department}</b>
                            <small>{req.location}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <b>{req.task_type}</b>
                        <small>{req.reason}</small>
                      </td>
                      <td>
                        <b>{req.assigned_count} / {req.required_count}</b>
                      </td>
                      <td>
                        {req.assigned_staff?.length > 0 ? (
                          <div className="assigned-avatars">
                            {req.assigned_staff.map((name) => (
                              <span key={name} className="staff-pill">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="unfilled-pill">Unfilled</span>
                        )}
                      </td>
                      <td>
                        <span className={`priority-tag priority-${req.priority.toLowerCase()}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td>{timeOf(req.deadline)}</td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No staff requests filed"
              description="Click 'New Staff Request' to dispatch staff to an operational area."
              icon={Activity}
            />
          )}
        </Panel>
      </div>

      {/* CREATE REQUEST MODAL */}
      {showModal && (
        <div className="dialog-scrim">
          <div className="dialog-modal">
            <div className="dialog-head">
              <div>
                <h2>New Staff Request</h2>
                <p>Submit staffing needs for automatic allocation</p>
              </div>
              <button className="icon-button" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateRequest}>
              <div className="form-grid">
                <label>
                  Department
                  <select
                    required
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Front Desk">Front Desk</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Kitchen">Kitchen</option>
                  </select>
                </label>
                <label>
                  Location / Operational Area
                  <input
                    required
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Floor 3, Ballroom B, Hot Line"
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Task Type
                  <input
                    required
                    type="text"
                    value={form.task_type}
                    onChange={(e) => setForm({ ...form, task_type: e.target.value })}
                    placeholder="e.g. Room Turnover, Banquet Setup"
                  />
                </label>
                <label>
                  Required Staff Count
                  <input
                    required
                    type="number"
                    min="1"
                    max="10"
                    value={form.required_count}
                    onChange={(e) => setForm({ ...form, required_count: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Priority Level
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent (VIP/Critical)</option>
                  </select>
                </label>
                <label>
                  Deadline Time
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Required Mandatory Skills (comma-separated)
                <input
                  type="text"
                  value={form.required_skills}
                  onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
                  placeholder="e.g. Room cleaning, Service, Allergen awareness"
                />
              </label>

              <label>
                Operational Reason & Instructions
                <textarea
                  rows="2"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Detail instructions for assigned team..."
                />
              </label>

              <div className="dialog-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  Submit & Auto-Allocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
