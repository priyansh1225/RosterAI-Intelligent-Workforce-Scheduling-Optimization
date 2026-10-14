
import React, { useState } from 'react'
import {
  Activity,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { AppLayout } from '../components/AppLayout'
import { Panel, StatusBadge, EmptyState } from '../components/Common'
import { api, timeOf } from '../services/api'

const INITIAL_FORM = {
  department: 'Housekeeping',
  location: '',
  task_type: 'Room Cleaning & Turnover',
  required_count: 2,
  required_skills: '',
  priority: 'HIGH',
  duration_minutes: 60,
  deadline: '',
  reason: '',
}

export function StaffRequestsPage({ departmentScope }) {
  const { data, requests, refreshRequests } = useData()

  const [showModal, setShowModal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    ...INITIAL_FORM,
    department: departmentScope || 'Housekeeping',
  })

  const filteredRequests = departmentScope
    ? requests.filter(
        (request) =>
          (request.department_name || request.department?.name || '')
            .toLowerCase() === departmentScope.toLowerCase(),
      )
    : requests

  async function handleCreateRequest(event) {
    event.preventDefault()
    setSaving(true)
    setFeedback('')

    try {
      const department = data.departments.find(
        (item) => item.name === form.department,
      )

      if (!department) {
        throw new Error(
          `Department "${form.department}" was not found. Check your departments in Django.`,
        )
      }

      const skillsArray = form.required_skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean)

      const deadline = form.deadline
        ? new Date(form.deadline).toISOString()
        : new Date(Date.now() + 60 * 60000).toISOString()

      const created = await api('/employees/staff-requests/', {
        method: 'POST',
        body: JSON.stringify({
          department: department.id,
          location: form.location.trim(),
          task_type: form.task_type.trim(),
          required_count: Number(form.required_count),
          required_skills: skillsArray,
          priority: form.priority,
          duration_minutes: Number(form.duration_minutes),
          deadline,
          reason: form.reason.trim(),
        }),
      })

      await refreshRequests()

      setShowModal(false)
      setForm({
        ...INITIAL_FORM,
        department: departmentScope || 'Housekeeping',
      })

      setFeedback(
        `Request ${created.request_code} saved successfully to Django. Staff allocation is not yet automated by the backend.`,
      )
    } catch (error) {
      setFeedback(`Error: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout
      pageTitle={
        departmentScope
          ? `${departmentScope} Staff Requests`
          : 'Operational Staff Requests'
      }
      pageDescription="Create and review staffing requests stored in the Django database."
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
        <div
          className={`toast-banner ${
            feedback.startsWith('Error:') ? 'error' : 'success'
          }`}
        >
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>×</button>
        </div>
      )}

      <div className="bento-grid">
        <Panel
          title="Staff Request Workflow"
          subtitle="Requests are persisted through the Django REST API."
          className="span-12"
        >
          <div className="engine-steps-bar">
            <div className="engine-step">
              <span className="step-num">1</span>
              <div>
                <b>Supervisor Request</b>
                <small>Location, headcount and skills</small>
              </div>
            </div>
            <ArrowRight size={16} color="#8a94a5" />
            <div className="engine-step">
              <span className="step-num">2</span>
              <div>
                <b>Database Storage</b>
                <small>Request saved in Django</small>
              </div>
            </div>
            <ArrowRight size={16} color="#8a94a5" />
            <div className="engine-step">
              <span className="step-num">3</span>
              <div>
                <b>Staff Allocation</b>
                <small>Backend allocation is a future step</small>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Staffing Requests"
          subtitle={`${filteredRequests.length} database requests`}
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
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => {
                    const assignedStaff = Array.isArray(
                      request.assigned_staff,
                    )
                      ? request.assigned_staff
                      : []

                    return (
                      <tr key={request.id}>
                        <td>
                          <b>{request.request_code || `REQ-${request.id}`}</b>
                        </td>
                        <td>
                          <div className="person-cell">
                            <div>
                              <b>
                                {request.department_name ||
                                  request.department?.name ||
                                  'Department'}
                              </b>
                              <small>{request.location}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <b>{request.task_type}</b>
                          <small>{request.reason}</small>
                        </td>
                        <td>
                          <b>
                            {request.assigned_count || 0} /{' '}
                            {request.required_count}
                          </b>
                        </td>
                        <td>
                          {assignedStaff.length > 0 ? (
                            <div className="assigned-avatars">
                              {assignedStaff.map((staff, index) => (
                                <span
                                  key={`${staff}-${index}`}
                                  className="staff-pill"
                                >
                                  {typeof staff === 'string'
                                    ? staff
                                    : staff.full_name || staff.name || 'Staff'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="unfilled-pill">
                              Not allocated
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`priority-tag priority-${(
                              request.priority || 'NORMAL'
                            ).toLowerCase()}`}
                          >
                            {request.priority || 'NORMAL'}
                          </span>
                        </td>
                        <td>{timeOf(request.deadline)}</td>
                        <td>
                          <StatusBadge status={request.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No staff requests found"
              description="Create a request to store it in the Django database."
              icon={Activity}
            />
          )}
        </Panel>
      </div>

      {showModal && (
        <div className="dialog-scrim">
          <div className="dialog-modal">
            <div className="dialog-head">
              <div>
                <h2>New Staff Request</h2>
                <p>Submit staffing requirements to Django</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
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
                    onChange={(event) =>
                      setForm({
                        ...form,
                        department: event.target.value,
                      })
                    }
                  >
                    {data.departments.map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Location / Operational Area
                  <input
                    required
                    value={form.location}
                    onChange={(event) =>
                      setForm({ ...form, location: event.target.value })
                    }
                    placeholder="e.g. Floor 3, Ballroom B"
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Task Type
                  <input
                    required
                    value={form.task_type}
                    onChange={(event) =>
                      setForm({ ...form, task_type: event.target.value })
                    }
                  />
                </label>

                <label>
                  Required Staff Count
                  <input
                    required
                    type="number"
                    min="1"
                    max="100"
                    value={form.required_count}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        required_count: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Priority
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({ ...form, priority: event.target.value })
                    }
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </label>

                <label>
                  Deadline
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    onChange={(event) =>
                      setForm({ ...form, deadline: event.target.value })
                    }
                  />
                </label>
              </div>

              <label>
                Required Skills (comma-separated)
                <input
                  value={form.required_skills}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      required_skills: event.target.value,
                    })
                  }
                  placeholder="Room cleaning, Service"
                />
              </label>

              <label>
                Operational Reason & Instructions
                <textarea
                  rows="2"
                  value={form.reason}
                  onChange={(event) =>
                    setForm({ ...form, reason: event.target.value })
                  }
                  placeholder="Instructions for the assigned team..."
                />
              </label>

              <div className="dialog-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Submit Staff Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
