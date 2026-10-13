import React, { useState } from 'react'
import {
  Grid2X2,
  Plus,
  Users,
  Settings2,
  X,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import { Panel, StatusBadge, EmptyState } from '../components/Common'
import { api, listData } from '../services/api'

export function DepartmentsPage() {
  const { data, reload } = useData()
  const { staffSession } = useAuth()
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [activeRuleModal, setActiveRuleModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const [deptForm, setDeptForm] = useState({ name: '', description: '' })
  const [ruleForm, setRuleForm] = useState({
    minimum_staff: 2,
    employees_per_occupied_room: 0.05,
    employees_per_check_in: 0.02,
    employees_per_check_out: 0.02,
    required_skills: '',
    shift_start_time: '08:00',
    shift_end_time: '16:00',
  })

  const openRuleModal = (dept) => {
    setActiveRuleModal(dept)
    const existing = data.staffingRules.find(
      (r) => Number(r.department) === Number(dept.id)
    )
    if (existing) {
      setRuleForm({
        minimum_staff: existing.minimum_staff || 0,
        employees_per_occupied_room: existing.employees_per_occupied_room || 0,
        employees_per_check_in: existing.employees_per_check_in || 0,
        employees_per_check_out: existing.employees_per_check_out || 0,
        required_skills: (existing.required_skills || []).join(', '),
        shift_start_time: (existing.shift_start_time || '08:00').slice(0, 5),
        shift_end_time: (existing.shift_end_time || '16:00').slice(0, 5),
      })
    } else {
      setRuleForm({
        minimum_staff: 2,
        employees_per_occupied_room: 0.05,
        employees_per_check_in: 0.02,
        employees_per_check_out: 0.02,
        required_skills: '',
        shift_start_time: '08:00',
        shift_end_time: '16:00',
      })
    }
  }

  const handleCreateDept = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/departments/', {
        method: 'POST',
        body: JSON.stringify(deptForm),
      })
      setShowDeptModal(false)
      setDeptForm({ name: '', description: '' })
      reload()
      setFeedback('Department successfully created.')
      setTimeout(() => setFeedback(''), 4000)
    } catch (err) {
      setFeedback(`Error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const handleSaveRule = async (e) => {
    e.preventDefault()
    if (!activeRuleModal) return
    setBusy(true)
    try {
      const existing = data.staffingRules.find(
        (r) => Number(r.department) === Number(activeRuleModal.id)
      )
      const payload = {
        department: activeRuleModal.id,
        minimum_staff: Number(ruleForm.minimum_staff),
        employees_per_occupied_room: Number(ruleForm.employees_per_occupied_room),
        employees_per_check_in: Number(ruleForm.employees_per_check_in),
        employees_per_check_out: Number(ruleForm.employees_per_check_out),
        required_skills: ruleForm.required_skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        shift_start_time: ruleForm.shift_start_time,
        shift_end_time: ruleForm.shift_end_time,
      }

      if (existing) {
        await api(`/forecasting/staffing-rules/${existing.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      } else {
        await api('/forecasting/staffing-rules/', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      setActiveRuleModal(null)
      reload()
      setFeedback('Department staffing rule updated successfully.')
      setTimeout(() => setFeedback(''), 4000)
    } catch (err) {
      setFeedback(`Error: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppLayout
      pageTitle="Departments & Staffing Rules"
      pageDescription="Configure operational department teams, minimum staffing ratios, and required shift skills."
      actions={
        <button
          className="button button-primary"
          onClick={() => setShowDeptModal(true)}
        >
          <Plus size={16} /> Add Department
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

      <div className="bento-grid">
        <Panel
          title="Hotel Operational Departments"
          subtitle={`${data.departments.length} departments active`}
          className="span-12"
        >
          <div className="department-grid">
            {data.departments.map((dept) => {
              const team = data.employees.filter((emp) => emp.department === dept.id)
              const rule = data.staffingRules.find((r) => Number(r.department) === Number(dept.id))

              return (
                <article className="department-card" key={dept.id}>
                  <div className="dept-card-top">
                    <h3>{dept.name}</h3>
                    <StatusBadge status={dept.is_active ? 'ACTIVE' : 'INACTIVE'} />
                  </div>
                  <p className="dept-desc">{dept.description || 'Hotel operational division'}</p>

                  <div className="department-count">
                    <b>{team.length}</b>
                    <span>Employees Assigned</span>
                  </div>

                  {rule ? (
                    <div className="rule-summary-box">
                      <div className="rule-summary-title">
                        <Sparkles size={13} /> Active Staffing Rule
                      </div>
                      <div className="rule-summary-details">
                        <span>Min Staff: <b>{rule.minimum_staff}</b></span>
                        <span>Shift: <b>{(rule.shift_start_time || '08:00').slice(0, 5)}–{(rule.shift_end_time || '16:00').slice(0, 5)}</b></span>
                      </div>
                    </div>
                  ) : (
                    <div className="rule-summary-box empty-rule">
                      <span>No active rule configured yet.</span>
                    </div>
                  )}

                  <button
                    className="button button-quiet button-rule-edit"
                    onClick={() => openRuleModal(dept)}
                  >
                    <Settings2 size={14} />
                    <span>Configure Staffing Rule</span>
                  </button>
                </article>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* CREATE DEPARTMENT MODAL */}
      {showDeptModal && (
        <div className="dialog-scrim">
          <div className="dialog-modal">
            <div className="dialog-head">
              <div>
                <h2>Create Department</h2>
                <p>Add a new operational division to RosterAI.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowDeptModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDept}>
              <label>
                Department Name
                <input
                  required
                  type="text"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Housekeeping, Front Desk, Kitchen"
                />
              </label>

              <label>
                Description & Mission
                <textarea
                  rows="3"
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Operational responsibilities and scope"
                />
              </label>

              <div className="dialog-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setShowDeptModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={busy}
                >
                  {busy ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFFING RULE MODAL */}
      {activeRuleModal && (
        <div className="dialog-scrim">
          <div className="dialog-modal">
            <div className="dialog-head">
              <div>
                <h2>Configure Staffing Rule</h2>
                <p>
                  {activeRuleModal.name} · Deterministic ratios linking occupancy to headcount
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setActiveRuleModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRule}>
              <div className="form-grid">
                <label>
                  Minimum Staffing Floor
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={ruleForm.minimum_staff}
                    onChange={(e) => setRuleForm({ ...ruleForm, minimum_staff: e.target.value })}
                  />
                </label>
                <label>
                  Staff per Occupied Room
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ruleForm.employees_per_occupied_room}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, employees_per_occupied_room: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Staff per Check-in
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ruleForm.employees_per_check_in}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, employees_per_check_in: e.target.value })
                    }
                  />
                </label>
                <label>
                  Staff per Check-out
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ruleForm.employees_per_check_out}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, employees_per_check_out: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Shift Window Start
                  <input
                    type="time"
                    value={ruleForm.shift_start_time}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, shift_start_time: e.target.value })
                    }
                  />
                </label>
                <label>
                  Shift Window End
                  <input
                    type="time"
                    value={ruleForm.shift_end_time}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, shift_end_time: e.target.value })
                    }
                  />
                </label>
              </div>

              <label>
                Mandatory Skills (comma-separated)
                <input
                  type="text"
                  value={ruleForm.required_skills}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, required_skills: e.target.value })
                  }
                  placeholder="Room cleaning, Laundry, Guest service"
                />
              </label>

              <div className="dialog-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setActiveRuleModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={busy}
                >
                  {busy ? 'Saving...' : 'Save Staffing Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
