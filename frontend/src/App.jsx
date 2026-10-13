import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'

// Pages
import { LoginPage } from './pages/LoginPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { WorkforcePage } from './pages/WorkforcePage'
import { DepartmentsPage } from './pages/DepartmentsPage'
import { RostersPage } from './pages/RostersPage'
import { RosterSuggestionsPage } from './pages/RosterSuggestionsPage'
import { OccupancyDemandPage } from './pages/OccupancyDemandPage'
import { StaffRequestsPage } from './pages/StaffRequestsPage'
import { LeaveRequestsPage } from './pages/LeaveRequestsPage'
import { TasksPage } from './pages/TasksPage'
import { ReportsPage } from './pages/ReportsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { SettingsPage } from './pages/SettingsPage'

// Department Pages
import {
  HousekeepingDashboard,
  HousekeepingFloorsPage,
  RoomReadinessPage,
} from './pages/HousekeepingPages'
import {
  FrontDeskDashboard,
  FrontDeskRoomRequestsPage,
} from './pages/FrontDeskPages'
import {
  FoodBeverageDashboard,
  KitchenDashboard,
} from './pages/FBAndKitchenPages'

// Employee Pages
import {
  EmployeeDashboard,
  EmployeeShiftsPage,
} from './pages/EmployeePages'

// Error Pages
import { UnauthorizedPage, NotFoundPage } from './pages/ErrorPages'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Authentication */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin Workspace */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/workforce" element={<WorkforcePage />} />
            <Route path="/admin/departments" element={<DepartmentsPage />} />
            <Route path="/admin/rosters" element={<RostersPage />} />
            <Route path="/admin/rosters/suggestions" element={<RosterSuggestionsPage />} />
            <Route path="/admin/occupancy" element={<OccupancyDemandPage />} />
            <Route path="/admin/requests" element={<StaffRequestsPage />} />
            <Route path="/admin/leave-requests" element={<LeaveRequestsPage />} />
            <Route path="/admin/tasks" element={<TasksPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/notifications" element={<NotificationsPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />

            {/* Housekeeping Workspace */}
            <Route path="/housekeeping/dashboard" element={<HousekeepingDashboard />} />
            <Route path="/housekeeping/staff" element={<WorkforcePage />} />
            <Route
              path="/housekeeping/requests"
              element={<StaffRequestsPage departmentScope="Housekeeping" />}
            />
            <Route
              path="/housekeeping/tasks"
              element={<TasksPage departmentScope="Housekeeping" />}
            />
            <Route path="/housekeeping/floors" element={<HousekeepingFloorsPage />} />
            <Route path="/housekeeping/room-readiness" element={<RoomReadinessPage />} />

            {/* Front Desk Workspace */}
            <Route path="/front-desk/dashboard" element={<FrontDeskDashboard />} />
            <Route path="/front-desk/room-requests" element={<FrontDeskRoomRequestsPage />} />
            <Route path="/front-desk/room-status" element={<RoomReadinessPage />} />
            <Route
              path="/front-desk/tasks"
              element={<TasksPage departmentScope="Front Desk" />}
            />

            {/* Food & Beverage Workspace */}
            <Route path="/food-beverage/dashboard" element={<FoodBeverageDashboard />} />
            <Route path="/food-beverage/staff" element={<WorkforcePage />} />
            <Route
              path="/food-beverage/requests"
              element={<StaffRequestsPage departmentScope="Food & Beverage" />}
            />
            <Route
              path="/food-beverage/tasks"
              element={<TasksPage departmentScope="Food & Beverage" />}
            />

            {/* Kitchen Workspace */}
            <Route path="/kitchen/dashboard" element={<KitchenDashboard />} />
            <Route path="/kitchen/staff" element={<WorkforcePage />} />
            <Route
              path="/kitchen/requests"
              element={<StaffRequestsPage departmentScope="Kitchen" />}
            />
            <Route
              path="/kitchen/tasks"
              element={<TasksPage departmentScope="Kitchen" />}
            />

            {/* Employee Workspace */}
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/my-shifts" element={<EmployeeShiftsPage />} />
            <Route path="/employee/my-tasks" element={<EmployeeDashboard />} />
            <Route path="/employee/leave-requests" element={<LeaveRequestsPage />} />
            <Route path="/employee/notifications" element={<NotificationsPage />} />

            {/* Error & Fallbacks */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/not-found" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
