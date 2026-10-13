import React, { useState } from 'react'
import {
  ListChecks,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Eye,
  Plus,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import { Panel, StatusBadge, EmptyState, ConfirmDialog } from '../components/Common'
import { operationsStore } from '../services/operationsStore'
import { timeOf } from '../services/api'

export function TasksPage({ departmentScope }) {
  const { tasks, refreshOps } = useData()
  const { currentUser } = useAuth()
  const [filterStatus, setFilterStatus] = useState('')
  const [inspectTask, setInspectTask] = useState(null)
  const [confirmComplete, setConfirmComplete] = useState(null)
  const [feedback, setFeedback] = useState('')

  const isSupervisorOrAdmin = currentUser.canVerify

  const filteredTasks = tasks.filter((t) => {
    const matchDept =
      !departmentScope || t.department?.toLowerCase() === departmentScope.toLowerCase()
    const matchStatus = !filterStatus || t.status === filterStatus
    return matchDept && matchStatus
  })

  const handleVerify = (task, isApproved) => {
    const nextStatus = isApproved ? 'VERIFIED_COMPLETED' : 'IN_PROGRESS'
    operationsStore.updateTaskStatus(
      task.id,
      nextStatus,
      currentUser.displayName || 'Supervisor',
      isApproved ? 'Inspection passed with 100% standard.' : 'Inspection requested rework.'
    )
    refreshOps()
    setInspectTask(null)
    setConfirmComplete(null)
    setFeedback(
      isApproved
        ? `Task ${task.id} verified as completed! Audit logged.`
        : `Task ${task.id} returned to employee for correction.`
    )
    setTimeout(() => setFeedback(''), 4000)
  }

  return (
    <AppLayout
      pageTitle={departmentScope ? `${departmentScope} Tasks` : 'Operational Tasks & Verification'}
      pageDescription="Full task lifecycle tracking: Assigned → Accepted → In Progress → Submitted for Verification → Verified Completed."
    >
      {feedback && (
        <div className={`toast-banner ${feedback.includes('completed') ? 'success' : 'warning'}`}>
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}>×</button>
        </div>
      )}

      {/* TASK LIFECYCLE GUIDE */}
      <div className="bento-grid">
        <Panel
          title="Standard Operational Task Lifecycle"
          subtitle="Employees cannot verify their own work; supervisor sign-off is mandatory"
          className="span-12"
        >
          <div className="task-flow-stages">
            <div className="flow-stage">
              <span className="stage-dot">1</span>
              <div>
                <b>ASSIGNED</b>
                <small>Auto-allocated</small>
              </div>
            </div>
            <ArrowRight size={14} color="#8a94a5" />
            <div className="flow-stage">
              <span className="stage-dot">2</span>
              <div>
                <b>ACCEPTED</b>
                <small>Staff acknowledges</small>
              </div>
            </div>
            <ArrowRight size={14} color="#8a94a5" />
            <div className="flow-stage">
              <span className="stage-dot">3</span>
              <div>
                <b>IN PROGRESS</b>
                <small>Work underway</small>
              </div>
            </div>
            <ArrowRight size={14} color="#8a94a5" />
            <div className="flow-stage">
              <span className="stage-dot stage-highlight">4</span>
              <div>
                <b>SUBMITTED</b>
                <small>Ready for review</small>
              </div>
            </div>
            <ArrowRight size={14} color="#8a94a5" />
            <div className="flow-stage">
              <span className="stage-dot stage-complete">5</span>
              <div>
                <b>VERIFIED COMPLETED</b>
                <small>Supervisor sign-off</small>
              </div>
            </div>
          </div>
        </Panel>

        {/* TASKS TABLE (span-12) */}
        <Panel
          title="Active Operational Tasks"
          subtitle={`${filteredTasks.length} tasks registered in hotel operations`}
          className="span-12"
          action={
            <div className="filter-select">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter tasks by status"
              >
                <option value="">All Statuses</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SUBMITTED_FOR_VERIFICATION">Awaiting Verification</option>
                <option value="VERIFIED_COMPLETED">Verified Completed</option>
              </select>
            </div>
          }
        >
          {filteredTasks.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Task Title & Scope</th>
                    <th>Department</th>
                    <th>Location</th>
                    <th>Assigned Staff</th>
                    <th>Deadline</th>
                    <th>Priority</th>
                    <th>Current Status</th>
                    <th>Supervisor Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((t) => {
                    const isAwaitingVerification = t.status === 'SUBMITTED_FOR_VERIFICATION'
                    return (
                      <tr key={t.id}>
                        <td><b>{t.id}</b></td>
                        <td>
                          <b>{t.title}</b>
                          <small>{t.notes}</small>
                        </td>
                        <td>{t.department}</td>
                        <td>{t.location}</td>
                        <td>
                          <b>{t.assigned_to || 'Unassigned'}</b>
                        </td>
                        <td>{timeOf(t.deadline)}</td>
                        <td>
                          <span className={`priority-tag priority-${t.priority.toLowerCase()}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={t.status} />
                        </td>
                        <td>
                          <div className="row-action-btns">
                            <button
                              className="button button-small button-quiet"
                              onClick={() => setInspectTask(t)}
                              title="Inspect Task History"
                            >
                              <Eye size={13} /> Inspect
                            </button>
                            {isAwaitingVerification && isSupervisorOrAdmin && (
                              <button
                                className="button button-small button-success"
                                onClick={() => setConfirmComplete(t)}
                              >
                                <CheckCircle2 size={13} /> Verify Done
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No tasks match the filter"
              description="Adjust the status filter or generate new tasks from staff requests."
              icon={ListChecks}
            />
          )}
        </Panel>
      </div>

      {/* INSPECT TASK MODAL */}
      {inspectTask && (
        <div className="dialog-scrim">
          <div className="dialog-modal">
            <div className="dialog-head">
              <div>
                <h2>{inspectTask.id} — Task Audit Trail</h2>
                <p>{inspectTask.title}</p>
              </div>
              <button className="icon-button" onClick={() => setInspectTask(null)}>
                ×
              </button>
            </div>

            <div className="task-inspect-body">
              <div className="inspect-meta-row">
                <div>
                  <span className="meta-label">Location:</span> <b>{inspectTask.location}</b>
                </div>
                <div>
                  <span className="meta-label">Assigned Staff:</span> <b>{inspectTask.assigned_to}</b>
                </div>
                <div>
                  <span className="meta-label">Deadline:</span> <b>{timeOf(inspectTask.deadline)}</b>
                </div>
              </div>

              <h3>Lifecycle Audit Events:</h3>
              <div className="audit-timeline">
                {(inspectTask.history || []).map((step, idx) => (
                  <div className="audit-item" key={idx}>
                    <div className="audit-bullet" />
                    <div className="audit-info">
                      <b>{step.step.replace(/_/g, ' ')}</b>
                      <small>
                        at {step.at} by <span>{step.by}</span>
                      </small>
                      {step.note && <p className="audit-note">{step.note}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {inspectTask.status === 'SUBMITTED_FOR_VERIFICATION' && isSupervisorOrAdmin && (
                <div className="inspect-actions">
                  <button
                    className="button button-destructive"
                    onClick={() => handleVerify(inspectTask, false)}
                  >
                    Reject (Request Rework)
                  </button>
                  <button
                    className="button button-primary"
                    onClick={() => handleVerify(inspectTask, true)}
                  >
                    Verify & Mark Completed
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM VERIFY COMPLETION MODAL */}
      <ConfirmDialog
        isOpen={!!confirmComplete}
        title="Verify Task Completion"
        message={`Confirm supervisor inspection for ${confirmComplete?.id} (${confirmComplete?.location}) submitted by ${confirmComplete?.assigned_to}? This will update hotel room status and record verification in the audit trail.`}
        confirmText="Confirm Task Completed"
        onConfirm={() => handleVerify(confirmComplete, true)}
        onCancel={() => setConfirmComplete(null)}
      />
    </AppLayout>
  )
}
