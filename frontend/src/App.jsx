import { useEffect, useMemo, useState } from "react"
import AuthPage from "./components/auth/AuthPage"
import AdminDashboard from "./components/dashboards/AdminDashboard"
import ManagerDashboard from "./components/dashboards/ManagerDashboard"
import EmployeeDashboard from "./components/dashboards/EmployeeDashboard"
import {
  fetchCountriesWithCurrencies,
  fetchCurrencyRates,
  formatAmount,
} from "./services/currencyApi"
import {
  initialCompany,
  initialUsers,
  initialExpenses,
  initialApprovalRules,
} from "./data/mockData"
import "./App.css"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8081/api"

function App() {
  const [authMode, setAuthMode] = useState("login")
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    country: "",
  })
  const [authMessage, setAuthMessage] = useState("")

  const [company, setCompany] = useState(initialCompany)
  const [users, setUsers] = useState(initialUsers)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [approvalRules, setApprovalRules] = useState(initialApprovalRules)
  const [managerExpenses, setManagerExpenses] = useState([])
  const [managerRules, setManagerRules] = useState(initialApprovalRules)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("authToken") || "")

  const [countries, setCountries] = useState([])
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [rates, setRates] = useState({ USD: 1 })

  useEffect(() => {
    let mounted = true

    async function loadCountryData() {
      try {
        const list = await fetchCountriesWithCurrencies()
        if (mounted) {
          setCountries(list)
        }
      } catch {
        if (mounted) {
          setCountries([{ country: "United States", currencyCode: "USD", currencySymbol: "$" }])
        }
      } finally {
        if (mounted) {
          setLoadingCountries(false)
        }
      }
    }

    loadCountryData()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadRates() {
      try {
        const nextRates = await fetchCurrencyRates("USD")
        if (mounted) {
          setRates(nextRates)
        }
      } catch {
        if (mounted) {
          setRates({ USD: 1 })
        }
      }
    }

    loadRates()

    return () => {
      mounted = false
    }
  }, [])

  const currentUser = useMemo(
    () => users.find((item) => item.id === currentUserId) || null,
    [users, currentUserId],
  )

  const formatMoney = (usdAmount) => {
    return formatAmount(usdAmount, company.currencyCode, company.currencySymbol, rates)
  }

  const handleAuthField = (key, value) => {
    setAuthForm((prev) => ({ ...prev, [key]: value }))
  }

  const clearAuthForm = () => {
    setAuthForm({
      name: "",
      email: "",
      password: "",
      role: "employee",
      country: "",
    })
  }

  const upsertUser = (user) => {
    setUsers((prev) => {
      const existingIndex = prev.findIndex((item) => String(item.id) === String(user.id))
      if (existingIndex === -1) {
        return [...prev, user]
      }

      const next = [...prev]
      next[existingIndex] = { ...next[existingIndex], ...user }
      return next
    })
  }

  const handleSignup = async () => {
    if (!authForm.email || !authForm.password || !authForm.name) {
      setAuthMessage("Fill all required signup fields.")
      return
    }

    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
          role: authForm.role,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        const rawMessage = payload.message || "Signup failed."
        if (rawMessage.toLowerCase().includes("database connection failed")) {
          setAuthMessage("Backend DB URL is invalid. Copy exact Transaction pooler URL from Supabase Connect and paste in backend/.env DATABASE_URL.")
          return
        }
        setAuthMessage(rawMessage)
        return
      }

      const nextUser = {
        ...payload.user,
        department: payload.user.role,
      }

      upsertUser(nextUser)
      setCurrentUserId(nextUser.id)
      setAuthToken(payload.token)
      localStorage.setItem("authToken", payload.token)
      setAuthMessage("")
      clearAuthForm()
    } catch {
      setAuthMessage("Cannot reach backend auth service.")
    }
  }

  const handleLogin = async () => {
    if (!authForm.email || !authForm.password) {
      setAuthMessage("Email and password are required.")
      return
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        const rawMessage = payload.message || "Invalid login credentials."
        if (rawMessage.toLowerCase().includes("database connection failed")) {
          setAuthMessage("Backend DB URL is invalid. Copy exact Transaction pooler URL from Supabase Connect and paste in backend/.env DATABASE_URL.")
          return
        }
        setAuthMessage(rawMessage)
        return
      }

      const nextUser = {
        ...payload.user,
        department: payload.user.role,
      }

      upsertUser(nextUser)
      setCurrentUserId(nextUser.id)
      setAuthToken(payload.token)
      localStorage.setItem("authToken", payload.token)
      setAuthMessage("")
      clearAuthForm()
    } catch {
      setAuthMessage("Cannot reach backend auth service.")
    }
  }

  const handleAuthSubmit = (event) => {
    event.preventDefault()
    if (authMode === "signup") {
      handleSignup()
      return
    }
    handleLogin()
  }

  const handleRoleChange = (userId, role) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === userId
          ? {
              ...item,
              role,
              department: role,
            }
          : item,
      ),
    )
  }

  const handleRuleChange = (key, value) => {
    setApprovalRules((prev) => ({ ...prev, [key]: Math.max(1, value || 1) }))
  }

  const handleOverrideStatus = (expenseId, status) => {
    setExpenses((prev) => prev.map((item) => (item.id === expenseId ? { ...item, status } : item)))
  }

  const fetchManagerDashboardData = async (token) => {
    const headers = {
      Authorization: `Bearer ${token}`,
    }

    const [expensesResponse, rulesResponse] = await Promise.all([
      fetch(`${API_BASE}/expenses?page=1&pageSize=500`, { headers }),
      fetch(`${API_BASE}/manager/rules`, { headers }),
    ])

    if (!expensesResponse.ok) {
      throw new Error("Failed to load manager expenses")
    }

    const expensesPayload = await expensesResponse.json()
    const nextExpenses = Array.isArray(expensesPayload.data) ? expensesPayload.data : []
    setManagerExpenses(nextExpenses)

    if (rulesResponse.ok) {
      const rulesPayload = await rulesResponse.json()
      setManagerRules({
        escalateAfterDays: Number(rulesPayload.escalateAfterDays || 3),
        minApprovals: Number(rulesPayload.minApprovals || 1),
      })
    }

    return nextExpenses
  }

  useEffect(() => {
    if (!currentUser || !authToken) {
      return
    }

    if (currentUser.role === "employee") {
      fetch(`${API_BASE}/expenses?page=1&pageSize=500`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
        .then(async (response) => {
          const payload = await response.json()
          if (!response.ok) {
            throw new Error(payload.message || "Failed to load expenses")
          }
          const rows = Array.isArray(payload.data) ? payload.data : []
          setExpenses(rows)
        })
        .catch(() => {
          setAuthMessage("Unable to load your expenses from backend.")
        })
      return
    }

    fetchManagerDashboardData(authToken)
      .then((items) => {
        if (currentUser.role === "admin") {
          setExpenses(items)
        }
      })
      .catch(() => {
        setAuthMessage("Unable to load expense data from backend.")
      })
  }, [currentUser, authToken])

  const handleManagerAction = async (expenseId, status) => {
    if (!authToken) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/manager/expenses/${expenseId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.message || "Failed to update expense")
      }

      await fetchManagerDashboardData(authToken)
    } catch (error) {
      setAuthMessage(error.message || "Failed to update expense status. Please retry.")
      await fetchManagerDashboardData(authToken).catch(() => {})
    }
  }

  const handleSubmitExpense = (payload) => {
    if (!currentUser || !authToken) {
      return
    }

    fetch(`${API_BASE}/expenses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employeeId: currentUser.id,
        description: payload.description,
        category: payload.category,
        amountUsd: payload.amountUsd,
      }),
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || "Failed to submit expense")
        }

        const newExpense = {
          id: data.id,
          employeeId: data.employee_id,
          employeeName: data.employee_name || currentUser.name,
          category: data.category,
          description: data.description,
          amountUsd: Number(data.amount_usd || payload.amountUsd),
          status: data.status,
          submittedAt: data.submitted_at,
        }

        setExpenses((prev) => [newExpense, ...prev])
      })
      .catch(() => {
        setAuthMessage("Expense submit failed. Please retry.")
      })
  }

  const handleLogout = () => {
    localStorage.removeItem("authToken")
    setAuthToken("")
    setManagerExpenses([])
    setManagerRules(initialApprovalRules)
    setCurrentUserId(null)
    setAuthMode("login")
  }

  if (!currentUser) {
    return (
      <AuthPage
        mode={authMode}
        form={authForm}
        countries={countries}
        loadingCountries={loadingCountries}
        onModeChange={setAuthMode}
        onFieldChange={handleAuthField}
        onSubmit={handleAuthSubmit}
        message={authMessage}
        companyReady={company.created}
      />
    )
  }

  if (currentUser.role === "admin") {
    return (
      <AdminDashboard
        user={currentUser}
        company={company}
        users={users}
        expenses={expenses}
        approvalRules={approvalRules}
        formatMoney={formatMoney}
        onRoleChange={handleRoleChange}
        onRuleChange={handleRuleChange}
        onOverrideStatus={handleOverrideStatus}
        onLogout={handleLogout}
      />
    )
  }

  if (currentUser.role === "manager") {
    return (
      <ManagerDashboard
        user={currentUser}
        company={company}
        expenses={managerExpenses}
        approvalRules={managerRules}
        formatMoney={formatMoney}
        onManagerAction={handleManagerAction}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <EmployeeDashboard
      user={currentUser}
      company={company}
      expenses={expenses.filter((item) => item.employeeId === currentUser.id)}
      formatMoney={formatMoney}
      onSubmitExpense={handleSubmitExpense}
      onLogout={handleLogout}
    />
  )
}

export default App
