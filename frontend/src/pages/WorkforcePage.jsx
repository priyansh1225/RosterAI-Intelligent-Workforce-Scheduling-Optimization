import React, { useState } from 'react'
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  CheckCircle2,
  X,
  Mail,
  Phone,
  Briefcase,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import { Panel, StatusBadge, EmptyState } from '../components/Common'
import { api, initials } from '../services/api'

export function WorkforcePage() {
  const { data, reload } = useData()
  const { staffSession } = useAuth()
  const [query, setQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const [form, setForm] = useState({
    employee_code: '',
    full_name: '',
    email: '',
    phone: '',
    department: '',
    skills: '',
    max_weekly_hours: 40,
  })

  const filteredEmployees = data.employees.filter((emp) => {
    const matchesQuery =
      `${emp.full_name} ${emp.employee_code} ${emp.department_name} ${(emp.skills || []).join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase())
    const matchesDept = !deptFilter || String(emp.department) === String(deptFilter)
    return matchesQuery && matchesDept
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setFeedback('')
    try {
      const skillsArray = form.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      await api('/employees/', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          department: Number(form.department),
          skills: skillsArray,
          max_weekly_hours: Number(form.max_weekly_hours) || 40,
        }),
      })

      setShowForm(false)
      setForm({
        employee_code: '',
        full_name: '',
        email: '',
        phone: '',
        department: '',
        skills: '',
        max_weekly_hours: 40,
      })
      reload()
      setFeedback('Employee successfully created and saved.')
      setTimeout(() => setFeedback(''), 4000)
    } catch (err) {
      setFeedback(`Error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppLayout
      pageTitle="Workforce Directory"
      pageDescription="Manage employee records, skill proficiencies, weekly hour limits, and department affiliations."
      actions={
        <button
          className="button button-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} /> Add Employee
        </button>
      }
    >
      {feedback && (
        <div className={`toast-banner ${feedback.startsWith('Error') ? 'error' : 'success'}`}>
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="single-stack">
        <Panel
          title="Hotel Employees"
          subtitle={`${data.employees.length} registered staff members across all departments`}
        >
          {/* SEARCH & FILTER TOOLBAR */}
          <div className="toolbar">
            <div className="searchbox">
              <Search size={16} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, ID, department or skills..."
                aria-label="Search employees"
              />
            </div>

            <div className="filter-select">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                aria-label="Filter by department"
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

          {/* EMPLOYEES TABLE */}
          {filteredEmployees.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee Name & ID</th>
                    <th>Department</th>
                    <th>Contact Info</th>
                    <th>Skill Coverage</th>
                    <th>Max Weekly Hours</th>
                    <th>Status</th>
                    <th>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <div className="person-cell">
                          <div className="avatar avatar-soft">
                            {initials(emp.full_name)}
                          </div>
                          <div>
                            <b>{emp.full_name}</b>
                            <small>{emp.employee_code}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="dept-tag">{emp.department_name}</span>
                      </td>
                      <td>
                        <div className="contact-cell">
                          <div>
                            <Mail size={12} /> {emp.email || '—'}
                          </div>
                          <div>
                            <Phone size={12} /> {emp.phone || '—'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="skill-list">
                          {(emp.skills || []).map((skill) => (
                            <span key={skill} className="skill-chip">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{emp.max_weekly_hours || 40} hrs/wk</td>
                      <td>
                        <StatusBadge status={emp.employment_status} />
                      </td>
                      <td>
                        <span className={`avail-tag ${emp.is_available ? 'avail-yes' : 'avail-no'}`}>
                          {emp.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No employees match your search"
              description="Adjust your search filters or add a new team member."
              icon={Users}
            />
          )}
        </Panel>
      </div>

      {/* CREATE EMPLOYEE MODAL */}
      {showForm && (
        <div className="dialog-scrim">
          <div className="dialog-modal">
            <div className="dialog-head">
              <div>
                <h2>Add New Employee</h2>
                <p>Register a team member in the live backend directory.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowForm(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Full Name
                  <input
                    required
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="e.g. Asha Sharma"
                  />
                </label>
                <label>
                  Employee Code
                  <input
                    required
                    type="text"
                    value={form.employee_code}
                    onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                    placeholder="e.g. EMP105"
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Department
                  <select
                    required
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {data.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Max Weekly Hours
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={form.max_weekly_hours}
                    onChange={(e) => setForm({ ...form, max_weekly_hours: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Email Address
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="asha.sharma@example.com"
                  />
                </label>
                <label>
                  Phone Number
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </label>
              </div>

              <label>
                Skills & Proficiencies (comma-separated)
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  placeholder="Room cleaning, Laundry, Floor inspection, Guest service"
                />
              </label>

              <div className="dialog-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={busy}
                >
                  {busy ? 'Saving Employee...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
