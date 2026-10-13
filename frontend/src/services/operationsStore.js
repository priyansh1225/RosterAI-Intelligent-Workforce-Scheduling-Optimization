/**
 * Operations Store
 * Bridges backend live models with operational workflows defined in PRD & DEMO_DATA_AND_SCENARIOS.
 * When backend endpoints exist, they are called directly.
 * For operational workflows pending backend endpoints (Tasks, Staff Requests, Room Readiness, Notifications),
 * this store manages responsive client-side state persisted in localStorage with five-minute reminder policy,
 * automatic staff allocation, supervisor verification, and audit trail.
 */

const STORAGE_KEY_TASKS = 'rosterai_operational_tasks_v1'
const STORAGE_KEY_REQUESTS = 'rosterai_staff_requests_v1'
const STORAGE_KEY_ROOMS = 'rosterai_room_inventory_v1'
const STORAGE_KEY_NOTIFICATIONS = 'rosterai_notifications_v1'

const INITIAL_ROOMS = [
  { room_number: '101', floor: 1, type: 'Deluxe King', status: 'ROOM_READY', assigned_to: 'Asha Sharma', last_inspected: '10:30 AM' },
  { room_number: '102', floor: 1, type: 'Standard Double', status: 'IN_PROGRESS', assigned_to: 'Mira Patel', last_inspected: 'Pending' },
  { room_number: '103', floor: 1, type: 'Suite', status: 'AWAITING_VERIFICATION', assigned_to: 'Asha Sharma', last_inspected: 'Awaiting' },
  { room_number: '201', floor: 2, type: 'Deluxe Queen', status: 'REQUEST_CREATED', assigned_to: null, last_inspected: 'None' },
  { room_number: '202', floor: 2, type: 'Executive Suite', status: 'STAFF_ASSIGNED', assigned_to: 'Mira Patel', last_inspected: 'None' },
  { room_number: '203', floor: 2, type: 'Standard Double', status: 'ROOM_READY', assigned_to: 'Asha Sharma', last_inspected: '09:15 AM' },
  { room_number: '301', floor: 3, type: 'Penthouse', status: 'AWAITING_VERIFICATION', assigned_to: 'Asha Sharma', last_inspected: 'Awaiting' },
  { room_number: '302', floor: 3, type: 'Deluxe King', status: 'ROOM_READY', assigned_to: 'Mira Patel', last_inspected: '11:00 AM' },
]

const INITIAL_REQUESTS = [
  {
    id: 'REQ-101',
    department: 'Housekeeping',
    location: 'Floor 2 (Rooms 201-204)',
    task_type: 'Turnover Cleaning',
    required_count: 2,
    assigned_count: 2,
    assigned_staff: ['Asha Sharma', 'Mira Patel'],
    required_skills: ['Room cleaning'],
    priority: 'HIGH',
    duration_minutes: 60,
    deadline: new Date(Date.now() + 45 * 60000).toISOString(),
    status: 'FULFILLED',
    reason: 'VIP Arrival at 14:00',
    shortage: 0,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'REQ-102',
    department: 'Food & Beverage',
    location: 'Grand Ballroom - Banquet',
    task_type: 'Dinner Service Setup',
    required_count: 3,
    assigned_count: 1,
    assigned_staff: ['Kabir Sen'],
    required_skills: ['Service', 'Allergen awareness'],
    priority: 'URGENT',
    duration_minutes: 120,
    deadline: new Date(Date.now() + 90 * 60000).toISOString(),
    status: 'PARTIAL',
    reason: 'Corporate Gala Setup (120 guests)',
    shortage: 2,
    shortage_reason: 'Only 1 staff with Allergen awareness currently on shift',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
]

const INITIAL_TASKS = [
  {
    id: 'TSK-201',
    title: 'Room 103 Suite Turnover & Sanitation',
    department: 'Housekeeping',
    location: 'Room 103 (Floor 1)',
    assigned_to: 'Asha Sharma',
    employee_id: 1,
    status: 'SUBMITTED_FOR_VERIFICATION',
    priority: 'HIGH',
    deadline: new Date(Date.now() + 10 * 60000).toISOString(),
    notes: 'Deep clean minibar, restock luxury amenities',
    submitted_at: new Date(Date.now() - 5 * 60000).toISOString(),
    history: [
      { step: 'ASSIGNED', at: '09:00 AM', by: 'System Auto-Allocator' },
      { step: 'ACCEPTED', at: '09:05 AM', by: 'Asha Sharma' },
      { step: 'IN_PROGRESS', at: '09:10 AM', by: 'Asha Sharma' },
      { step: 'SUBMITTED_FOR_VERIFICATION', at: '09:55 AM', by: 'Asha Sharma' },
    ],
  },
  {
    id: 'TSK-202',
    title: 'Room 202 Executive Suite Preparation',
    department: 'Housekeeping',
    location: 'Room 202 (Floor 2)',
    assigned_to: 'Mira Patel',
    employee_id: 2,
    status: 'IN_PROGRESS',
    priority: 'NORMAL',
    deadline: new Date(Date.now() + 35 * 60000).toISOString(),
    notes: 'Check-in scheduled for 15:00',
    history: [
      { step: 'ASSIGNED', at: '09:30 AM', by: 'System Auto-Allocator' },
      { step: 'ACCEPTED', at: '09:32 AM', by: 'Mira Patel' },
      { step: 'IN_PROGRESS', at: '09:40 AM', by: 'Mira Patel' },
    ],
  },
  {
    id: 'TSK-203',
    title: 'Kitchen Line Prep & Station Sanitation',
    department: 'Kitchen',
    location: 'Hot Line Station 2',
    assigned_to: 'Rohan Paul',
    employee_id: 4,
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    deadline: new Date(Date.now() + 4 * 60000).toISOString(), // Approaching 5m deadline
    notes: 'Dinner service mise-en-place & allergen checklist',
    history: [
      { step: 'ASSIGNED', at: '10:00 AM', by: 'Kitchen Supervisor' },
      { step: 'ACCEPTED', at: '10:05 AM', by: 'Rohan Paul' },
      { step: 'IN_PROGRESS', at: '10:10 AM', by: 'Rohan Paul' },
    ],
  },
  {
    id: 'TSK-204',
    title: 'Banquet Floor Table Setup',
    department: 'Food & Beverage',
    location: 'Ballroom Section B',
    assigned_to: 'Kabir Sen',
    employee_id: 3,
    status: 'ASSIGNED',
    priority: 'NORMAL',
    deadline: new Date(Date.now() + 120 * 60000).toISOString(),
    notes: 'Setup 12 round tables for 8 pax',
    history: [
      { step: 'ASSIGNED', at: '10:15 AM', by: 'F&B Supervisor' },
    ],
  },
]

const INITIAL_NOTIFICATIONS = [
  {
    id: 'NOTIF-1',
    type: 'DEADLINE_REMINDER',
    title: '5-Minute Deadline Warning',
    message: 'Task TSK-203 (Hot Line Station 2 Prep) deadline is in 4 minutes.',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    read: false,
    department: 'Kitchen',
    task_id: 'TSK-204',
  },
  {
    id: 'NOTIF-2',
    type: 'VERIFICATION_REQUIRED',
    title: 'Room 103 Awaiting Supervisor Verification',
    message: 'Asha Sharma submitted Room 103 turnover for inspection.',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    read: false,
    department: 'Housekeeping',
    task_id: 'TSK-201',
  },
  {
    id: 'NOTIF-3',
    type: 'ALLOCATION_ALERT',
    title: 'Staffing Shortage on REQ-102',
    message: 'Food & Beverage request REQ-102 has 2 unfilled staff slots due to allergen skill constraint.',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    read: true,
    department: 'Food & Beverage',
  },
]

function loadState(key, fallback) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

function saveState(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.error('Storage save failed', err)
  }
}

export const operationsStore = {
  getRooms() {
    return loadState(STORAGE_KEY_ROOMS, INITIAL_ROOMS)
  },
  updateRoom(roomNumber, updates) {
    const rooms = this.getRooms().map((r) =>
      r.room_number === roomNumber ? { ...r, ...updates } : r
    )
    saveState(STORAGE_KEY_ROOMS, rooms)
    return rooms
  },

  getRequests() {
    return loadState(STORAGE_KEY_REQUESTS, INITIAL_REQUESTS)
  },
  createRequest(requestData, availableEmployees = []) {
    const requests = this.getRequests()
    const id = `REQ-${100 + requests.length + 1}`

    // Automatic allocation logic based on required skills & availability
    const needed = Number(requestData.required_count) || 1
    const reqSkills = (requestData.required_skills || []).map((s) => s.toLowerCase().trim())

    const eligible = availableEmployees.filter((emp) => {
      const empSkills = (emp.skills || []).map((s) => s.toLowerCase().trim())
      const hasSkills = reqSkills.every((s) => empSkills.includes(s))
      const sameDept =
        !requestData.department ||
        emp.department_name?.toLowerCase() === requestData.department.toLowerCase()
      return emp.employment_status === 'ACTIVE' && emp.is_available && hasSkills && sameDept
    })

    const assigned = eligible.slice(0, needed)
    const assignedCount = assigned.length
    const shortage = Math.max(0, needed - assignedCount)

    const newReq = {
      id,
      ...requestData,
      assigned_count: assignedCount,
      assigned_staff: assigned.map((e) => e.full_name),
      shortage,
      status: shortage === 0 ? 'FULFILLED' : assignedCount > 0 ? 'PARTIAL' : 'SHORTAGE',
      shortage_reason:
        shortage > 0
          ? `Shortage of ${shortage} employee(s). Only ${assignedCount} qualified staff available on shift.`
          : null,
      created_at: new Date().toISOString(),
    }

    const updated = [newReq, ...requests]
    saveState(STORAGE_KEY_REQUESTS, updated)

    // Automatically create corresponding tasks for assigned workers
    if (assigned.length > 0) {
      assigned.forEach((emp) => {
        this.createTask({
          title: `${requestData.task_type || 'Operations Task'} - ${requestData.location}`,
          department: requestData.department,
          location: requestData.location,
          assigned_to: emp.full_name,
          employee_id: emp.id,
          priority: requestData.priority || 'NORMAL',
          deadline: requestData.deadline,
          notes: requestData.reason || '',
        })
      })
    }

    return newReq
  },

  getTasks() {
    return loadState(STORAGE_KEY_TASKS, INITIAL_TASKS)
  },
  createTask(taskData) {
    const tasks = this.getTasks()
    const id = `TSK-${200 + tasks.length + 1}`
    const newTask = {
      id,
      ...taskData,
      status: 'ASSIGNED',
      history: [
        {
          step: 'ASSIGNED',
          at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          by: 'System Auto-Allocator',
        },
      ],
    }
    const updated = [newTask, ...tasks]
    saveState(STORAGE_KEY_TASKS, updated)
    return newTask
  },
  updateTaskStatus(taskId, nextStatus, actorName = 'User', note = '') {
    const tasks = this.getTasks().map((t) => {
      if (t.id === taskId) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const updatedHistory = [
          ...(t.history || []),
          {
            step: nextStatus,
            at: timeStr,
            by: actorName,
            note: note || undefined,
          },
        ]
        return {
          ...t,
          status: nextStatus,
          history: updatedHistory,
          ...(nextStatus === 'SUBMITTED_FOR_VERIFICATION' ? { submitted_at: new Date().toISOString() } : {}),
          ...(nextStatus === 'VERIFIED_COMPLETED' ? { verified_at: new Date().toISOString(), verified_by: actorName } : {}),
        }
      }
      return t
    })
    saveState(STORAGE_KEY_TASKS, tasks)

    // If this task corresponds to a room turnover, update the room readiness state
    const targetTask = tasks.find((t) => t.id === taskId)
    if (targetTask && targetTask.location && targetTask.location.includes('Room')) {
      const match = targetTask.location.match(/Room\s*(\d+)/i)
      if (match) {
        const roomNum = match[1]
        let roomStatus = 'IN_PROGRESS'
        if (nextStatus === 'SUBMITTED_FOR_VERIFICATION') roomStatus = 'AWAITING_VERIFICATION'
        if (nextStatus === 'VERIFIED_COMPLETED') roomStatus = 'ROOM_READY'
        this.updateRoom(roomNum, {
          status: roomStatus,
          assigned_to: targetTask.assigned_to,
          last_inspected: nextStatus === 'VERIFIED_COMPLETED' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In progress',
        })
      }
    }

    return tasks
  },

  getNotifications() {
    return loadState(STORAGE_KEY_NOTIFICATIONS, INITIAL_NOTIFICATIONS)
  },
  markNotificationRead(notifId) {
    const notifs = this.getNotifications().map((n) =>
      n.id === notifId ? { ...n, read: true } : n
    )
    saveState(STORAGE_KEY_NOTIFICATIONS, notifs)
    return notifs
  },
  markAllNotificationsRead() {
    const notifs = this.getNotifications().map((n) => ({ ...n, read: true }))
    saveState(STORAGE_KEY_NOTIFICATIONS, notifs)
    return notifs
  },
}
