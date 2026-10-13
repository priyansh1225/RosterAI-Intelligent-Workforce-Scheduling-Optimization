import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, listData } from '../services/api'
import { operationsStore } from '../services/operationsStore'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [data, setData] = useState({
    employees: [],
    departments: [],
    occupancy: [],
    rosters: [],
    weeklyShifts: [],
    demand: null,
    leave: [],
    staffingRules: [],
  })
  const [states, setStates] = useState({ loading: true })
  const [refreshCount, setRefreshCount] = useState(0)

  // Operations state
  const [tasks, setTasks] = useState([])
  const [requests, setRequests] = useState([])
  const [rooms, setRooms] = useState([])
  const [notifications, setNotifications] = useState([])

  const reload = useCallback(() => {
    setRefreshCount((c) => c + 1)
  }, [])

  // Sync operations from store
  const refreshOps = useCallback(() => {
    setTasks(operationsStore.getTasks())
    setRequests(operationsStore.getRequests())
    setRooms(operationsStore.getRooms())
    setNotifications(operationsStore.getNotifications())
  }, [])

  useEffect(() => {
    refreshOps()
  }, [refreshOps])

  useEffect(() => {
    let live = true
    const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

    const load = async (key, path) => {
      try {
        const result = await api(path)
        return [key, { data: result, error: '' }]
      } catch (err) {
        return [key, { data: null, error: err.message }]
      }
    }

    Promise.all([
      load('employees', '/employees/'),
      load('departments', '/departments/'),
      load('occupancy', '/occupancy/'),
      load('rosters', `/rosters/?date=${today}`),
      load('weeklyShifts', `/shifts/weekly/?date=${today}`),
      load('demand', `/demand/?date=${today}`),
      load('leave', '/employees/leave-requests/'),
      load('staffingRules', '/forecasting/staffing-rules/'),
    ]).then((results) => {
      if (!live) return
      const nextData = {}
      const nextStates = {}
      results.forEach(([key, state]) => {
        nextStates[key] = state.error
        nextData[key] = state.data
      })

      setData({
        employees: listData(nextData.employees),
        departments: listData(nextData.departments),
        occupancy: listData(nextData.occupancy),
        rosters: listData(nextData.rosters),
        weeklyShifts: listData(nextData.weeklyShifts),
        demand: nextData.demand,
        leave: listData(nextData.leave),
        staffingRules: listData(nextData.staffingRules),
      })
      setStates({ ...nextStates, loading: false })
    })

    return () => {
      live = false
    }
  }, [refreshCount])

  // Reminder policy check: auto-check for tasks within 5 minutes of deadline
  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now()
      const allTasks = operationsStore.getTasks()
      const allNotifs = operationsStore.getNotifications()

      allTasks.forEach((tsk) => {
        if (!['ASSIGNED', 'IN_PROGRESS', 'ACCEPTED'].includes(tsk.status)) return
        const dl = new Date(tsk.deadline).getTime()
        const diffMinutes = (dl - now) / 60000

        // If between 0 and 5 minutes remaining and not yet notified
        if (diffMinutes > 0 && diffMinutes <= 5) {
          const alreadyNotified = allNotifs.some(
            (n) => n.task_id === tsk.id && n.type === 'DEADLINE_REMINDER'
          )
          if (!alreadyNotified) {
            const newNotif = {
              id: `NOTIF-${Date.now()}`,
              type: 'DEADLINE_REMINDER',
              title: `5-Minute Deadline Alert: ${tsk.id}`,
              message: `Task "${tsk.title}" is due in ${Math.ceil(diffMinutes)} minutes (${tsk.location}).`,
              timestamp: new Date().toISOString(),
              read: false,
              department: tsk.department,
              task_id: tsk.id,
            }
            const current = operationsStore.getNotifications()
            localStorage.setItem('rosterai_notifications_v1', JSON.stringify([newNotif, ...current]))
            refreshOps()
          }
        }
      })
    }

    checkReminders()
    const timer = setInterval(checkReminders, 30000)
    return () => clearInterval(timer)
  }, [refreshOps])

  return (
    <DataContext.Provider
      value={{
        data,
        states,
        reload,
        tasks,
        requests,
        rooms,
        notifications,
        refreshOps,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
