import React from 'react'
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { AppLayout } from '../components/AppLayout'
import { Panel, StatusBadge, EmptyState } from '../components/Common'
import { operationsStore } from '../services/operationsStore'
import { timeOf } from '../services/api'

export function NotificationsPage() {
  const { notifications, refreshOps } = useData()

  const handleMarkRead = (id) => {
    operationsStore.markNotificationRead(id)
    refreshOps()
  }

  const handleMarkAllRead = () => {
    operationsStore.markAllNotificationsRead()
    refreshOps()
  }

  return (
    <AppLayout
      pageTitle="Notifications & Deadline Alerts"
      pageDescription="Operational alerts, approaching 5-minute task deadlines, and supervisor verification notices."
      actions={
        <button className="button button-quiet" onClick={handleMarkAllRead}>
          <CheckCircle2 size={15} /> Mark All as Read
        </button>
      }
    >
      <div className="single-stack">
        <Panel
          title="Notification Center"
          subtitle={`${notifications.filter((n) => !n.read).length} unread notices`}
        >
          {notifications.length > 0 ? (
            <div className="notif-full-list">
              {notifications.map((n) => {
                let Icon = Info
                let tone = 'info'
                if (n.type === 'DEADLINE_REMINDER') {
                  Icon = AlertTriangle
                  tone = 'warning'
                } else if (n.type === 'VERIFICATION_REQUIRED') {
                  Icon = Clock
                  tone = 'info'
                } else if (n.type === 'ALLOCATION_ALERT') {
                  Icon = ShieldAlert
                  tone = 'error'
                }

                return (
                  <div
                    key={n.id}
                    className={`notif-card ${n.read ? 'read' : 'unread'} notif-${tone}`}
                  >
                    <div className="notif-icon-box">
                      <Icon size={18} />
                    </div>
                    <div className="notif-content">
                      <div className="notif-head-row">
                        <b>{n.title}</b>
                        <span className="notif-time">{timeOf(n.timestamp)}</span>
                      </div>
                      <p>{n.message}</p>
                      <div className="notif-meta">
                        <span className="notif-dept-tag">{n.department}</span>
                        {n.task_id && <span className="notif-task-tag">Task: {n.task_id}</span>}
                      </div>
                    </div>
                    {!n.read && (
                      <button
                        className="button button-small button-quiet"
                        onClick={() => handleMarkRead(n.id)}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title="No notifications"
              description="You have no unread operational alerts or deadline reminders."
              icon={Bell}
            />
          )}
        </Panel>

        <Panel
          title="Five-Minute Deadline Reminder Policy"
          subtitle="Autonomous system monitoring"
          className="span-12"
        >
          <div className="reminder-policy-box">
            <Clock size={20} color="#315efb" />
            <div>
              <b>Proactive Operational Safeguard:</b>
              <p>
                Tasks nearing their target completion time trigger automated reminders 5 minutes before the deadline.
                Overdue items immediately escalate to the respective department supervisor without auto-completing the task.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}
