import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'

import { api, listData } from '../services/api'
import { operationsStore } from '../services/operationsStore'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [data, setData] = useState({
    employees: [],
    departments: [],
    shifts: [],
    rosters: [],
    occupancy: [],
    forecasting: [],
    demand: [],
  })

  const [states, setStates] = useState({
    loading: true,
  })

  const [refreshCount, setRefreshCount] = useState(0)

  const [tasks, setTasks] = useState([])
  const [requests, setRequests] = useState([])
  const [rooms, setRooms] = useState([])
  const [notifications, setNotifications] = useState([])

  const reload = useCallback(() => {
    setRefreshCount((count) => count + 1)
  }, [])

  // Load tasks from Django.
  const refreshTasks = useCallback(async () => {
    try {
      const result = await api('/tasks/')
      setTasks(listData(result))
    } catch (err) {
      console.error('Failed to load tasks from Django:', err)
    }
  }, [])

  // Load staff requests from Django.
  const refreshRequests = useCallback(async () => {
    try {
      const result = await api('/employees/staff-requests/')
      setRequests(listData(result))
    } catch (err) {
      console.error('Failed to load staff requests from Django:', err)
    }
  }, [])

  // Load rooms from Django.
  const refreshRooms = useCallback(async () => {
    try {
      const result = await api('/occupancy/rooms/')
      setRooms(listData(result))
    } catch (err) {
      console.error('Failed to load rooms from Django:', err)
    }
  }, [])

  // Refresh operational data.
  const refreshOps = useCallback(async () => {
    setNotifications(operationsStore.getNotifications())

    await Promise.all([
      refreshTasks(),
      refreshRequests(),
      refreshRooms(),
    ])
  }, [refreshTasks, refreshRequests, refreshRooms])

  // Load operational data when the provider mounts.
  useEffect(() => {
    refreshOps()
  }, [refreshOps])

  // Load general application data from Django.
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setStates((previous) => ({
        ...previous,
        loading: true,
        error: undefined,
      }))

      try {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const today = `${year}-${month}-${day}`

        const [
          employeesResult,
          departmentsResult,
          shiftsResult,
          rostersResult,
          occupancyResult,
          forecastingResult,
          demandResult,
        ] = await Promise.all([
          api('/employees/'),
          api('/departments/'),
          api('/shifts/'),
          api('/rosters/'),
          api('/occupancy/'),
          api('/forecasting/'),
          api(`/demand/?date=${today}`),
        ])

        if (cancelled) return

        setData({
          employees: listData(employeesResult),
          departments: listData(departmentsResult),
          shifts: listData(shiftsResult),
          rosters: listData(rostersResult),
          occupancy: listData(occupancyResult),
          forecasting: listData(forecastingResult),
          demand: listData(demandResult),
        })

        setStates({ loading: false })
      } catch (err) {
        if (cancelled) return

        console.error('Failed to load application data:', err)

        setStates({
          loading: false,
          error: err.message || 'Failed to load application data',
        })
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [refreshCount])

  // Keep the existing local reminder policy unchanged for now.
  useEffect(() => {
    const checkReminders = () => {
      try {
        const storedTasks = operationsStore.getTasks()
        const storedNotifications = operationsStore.getNotifications()

        if (!Array.isArray(storedTasks)) return
        if (!Array.isArray(storedNotifications)) return
      } catch (err) {
        console.error('Failed to check reminders:', err)
      }
    }

    checkReminders()

    const interval = setInterval(checkReminders, 30000)

    return () => clearInterval(interval)
  }, [])

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
        refreshTasks,
        refreshRequests,
        refreshRooms,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)

  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }

  return context
}