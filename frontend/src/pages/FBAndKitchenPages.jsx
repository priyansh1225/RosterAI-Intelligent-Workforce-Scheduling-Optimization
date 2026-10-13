import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Activity,
  ListChecks,
  Clock,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  UtensilsCrossed,
  ChefHat,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { AppLayout } from '../components/AppLayout'
import { StatCard, Panel, StatusBadge, EmptyState } from '../components/Common'
import { initials, timeOf } from '../services/api'

export function FoodBeverageDashboard() {
  const { data, tasks, requests } = useData()
  const navigate = useNavigate()

  const fbStaff = data.employees.filter((e) =>
    e.department_name?.toLowerCase().includes('food') ||
    e.department_name?.toLowerCase().includes('beverage')
  )
  const fbTasks = tasks.filter((t) => t.department === 'Food & Beverage')
  const fbRequests = requests.filter((r) => r.department === 'Food & Beverage')

  return (
    <AppLayout
      pageTitle="Food & Beverage Operations Hub"
      pageDescription="Dining rooms, banquet events, bar service staffing, and allergen skill coverage."
      actions={
        <div className="action-buttons">
          <button
            className="button button-quiet"
            onClick={() => navigate('/food-beverage/requests')}
          >
            <Activity size={15} /> Request Banquet Staff
          </button>
          <button
            className="button button-primary"
            onClick={() => navigate('/food-beverage/tasks')}
          >
            <ListChecks size={15} /> Service Tasks
          </button>
        </div>
      }
    >
      <div className="stats-grid">
        <StatCard
          label="F&B Staff on Shift"
          value={fbStaff.length}
          foot="Active service team"
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Active Service Tasks"
          value={fbTasks.length}
          foot="Dining & banquet setups"
          icon={ListChecks}
          tone="violet"
        />
        <StatCard
          label="Pending Staff Requests"
          value={fbRequests.length}
          foot="Event requirements"
          icon={Activity}
          tone="amber"
        />
        <StatCard
          label="Allergen Certified"
          value={fbStaff.filter((e) => (e.skills || []).some((s) => s.toLowerCase().includes('allergen'))).length}
          foot="Mandatory safety skill"
          icon={Sparkles}
          tone="emerald"
        />
      </div>

      <div className="bento-grid">
        <Panel
          title="F&B Operations Tasks & Event Setups"
          subtitle="Dining room and banquet coordination"
          className="span-8"
          action={
            <Link to="/food-beverage/tasks" className="text-action">
              All Tasks <ArrowRight size={14} />
            </Link>
          }
        >
          {fbTasks.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Event / Task Title</th>
                    <th>Station Location</th>
                    <th>Assigned Staff</th>
                    <th>Deadline</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fbTasks.map((t) => (
                    <tr key={t.id}>
                      <td><b>{t.id}</b></td>
                      <td>{t.title}</td>
                      <td>{t.location}</td>
                      <td>{t.assigned_to || 'Unassigned'}</td>
                      <td>{timeOf(t.deadline)}</td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No active F&B tasks"
              description="Banquet setups and dining assignments will appear here."
              icon={ListChecks}
            />
          )}
        </Panel>

        <Panel
          title="F&B Service Team"
          subtitle="Waitstaff, bartenders, and banquet team"
          className="span-4"
          action={
            <Link to="/food-beverage/staff" className="text-action">
              View Staff <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="leave-list">
            {fbStaff.map((p) => (
              <div key={p.id} className="leave-row">
                <div className="avatar avatar-soft">{initials(p.full_name)}</div>
                <div>
                  <b>{p.full_name}</b>
                  <small>{(p.skills || []).join(', ') || 'Service'}</small>
                </div>
                <StatusBadge status={p.is_available ? 'AVAILABLE' : 'UNAVAILABLE'} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}

export function KitchenDashboard() {
  const { data, tasks, requests } = useData()
  const navigate = useNavigate()

  const kitchenStaff = data.employees.filter((e) =>
    e.department_name?.toLowerCase().includes('kitchen')
  )
  const kitchenTasks = tasks.filter((t) => t.department === 'Kitchen')
  const kitchenRequests = requests.filter((r) => r.department === 'Kitchen')

  return (
    <AppLayout
      pageTitle="Kitchen Brigade Hub"
      pageDescription="Station coverage, prep deadlines, food safety compliance, and culinary team coordination."
      actions={
        <div className="action-buttons">
          <button
            className="button button-quiet"
            onClick={() => navigate('/kitchen/requests')}
          >
            <Activity size={15} /> Request Line Staff
          </button>
          <button
            className="button button-primary"
            onClick={() => navigate('/kitchen/tasks')}
          >
            <ListChecks size={15} /> Station Prep Tasks
          </button>
        </div>
      }
    >
      <div className="stats-grid">
        <StatCard
          label="Brigade Staff on Shift"
          value={kitchenStaff.length}
          foot="Chefs & line cooks"
          icon={ChefHat}
          tone="blue"
        />
        <StatCard
          label="Active Station Tasks"
          value={kitchenTasks.length}
          foot="Line prep & sanitation"
          icon={ListChecks}
          tone="violet"
        />
        <StatCard
          label="Pending Staff Requests"
          value={kitchenRequests.length}
          foot="Station reinforcements"
          icon={Activity}
          tone="amber"
        />
        <StatCard
          label="Food Safety Certified"
          value={kitchenStaff.filter((e) => (e.skills || []).some((s) => s.toLowerCase().includes('safety'))).length}
          foot="Certified cooks"
          icon={Sparkles}
          tone="emerald"
        />
      </div>

      <div className="bento-grid">
        <Panel
          title="Active Culinary Prep Tasks & Deadlines"
          subtitle="Station assignments and food safety checklists"
          className="span-8"
          action={
            <Link to="/kitchen/tasks" className="text-action">
              All Tasks <ArrowRight size={14} />
            </Link>
          }
        >
          {kitchenTasks.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Station & Prep Item</th>
                    <th>Station Area</th>
                    <th>Assigned Cook</th>
                    <th>Prep Deadline</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {kitchenTasks.map((t) => (
                    <tr key={t.id}>
                      <td><b>{t.id}</b></td>
                      <td>{t.title}</td>
                      <td>{t.location}</td>
                      <td>{t.assigned_to || 'Unassigned'}</td>
                      <td>{timeOf(t.deadline)}</td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No active kitchen tasks"
              description="Culinary line assignments will appear here."
              icon={ListChecks}
            />
          )}
        </Panel>

        <Panel
          title="Culinary Brigade Staff"
          subtitle="Line cooks, prep chefs, and stewards"
          className="span-4"
          action={
            <Link to="/kitchen/staff" className="text-action">
              View Brigade <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="leave-list">
            {kitchenStaff.map((p) => (
              <div key={p.id} className="leave-row">
                <div className="avatar avatar-soft">{initials(p.full_name)}</div>
                <div>
                  <b>{p.full_name}</b>
                  <small>{(p.skills || []).join(', ') || 'Food prep'}</small>
                </div>
                <StatusBadge status={p.is_available ? 'AVAILABLE' : 'UNAVAILABLE'} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppLayout>
  )
}
