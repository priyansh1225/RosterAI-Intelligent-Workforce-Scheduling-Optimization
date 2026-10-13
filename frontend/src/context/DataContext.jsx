
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

  // Operations state
  const [tasks, setTasks] = useState([])
  const [requests, setRequests] = useState([])
  const [rooms, setRooms] = useState([])
  const [notifications, setNotifications] = useState([])

  // Refresh general API data
  const reload = useCallback(() => {
    setRefreshCount((count) => count + 1)
  }, [])

  // Load tasks from Django
  const refreshTasks = useCallback(async () => {
    try {
      const result = await api('/tasks/')
      console.log('Tasks received from Django:', result)
      setTasks(listData(result))
    } catch (err) {
      console.error('Failed to load tasks from Django:', err)
    }
  }, [])

  // Refresh local operations data and database tasks
  const refreshOps = useCallback(() => {
    setRequests(operationsStore.getRequests())
    setRooms(operationsStore.getRooms())
    setNotifications(operationsStore.getNotifications())

    refreshTasks()
  }, [refreshTasks])

  // Load operations data when the provider mounts
  useEffect(() => {
    refreshOps()
  }, [refreshOps])

  // Load departments, employees, shifts, rosters, and other API data
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setStates((previous) => ({
        ...previous,
        loading: true,
        error: undefined,
      }))

      try {
        // Use the local calendar date for the demand API.
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

        setStates({
          loading: false,
        })
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

  // Existing reminder policy for locally stored tasks
  useEffect(() => {
    const checkReminders = () => {
      try {
        const storedTasks = operationsStore.getTasks()
        const storedNotifications =
          operationsStore.getNotifications()

        // Keep the existing reminder storage unchanged.
        // Database task reminders will be integrated separately.
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
