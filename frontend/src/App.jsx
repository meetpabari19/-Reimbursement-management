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
  const [currentUserId, setCurrentUserId] = useState(null)

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

  const handleSignup = () => {
    if (!authForm.email || !authForm.password || !authForm.name) {
      setAuthMessage("Fill all required signup fields.")
      return
    }

    if (!company.created && authForm.role !== "admin") {
      setAuthMessage("Admin signup is required first to create company.")
      return
    }

    if (users.some((item) => item.email.toLowerCase() === authForm.email.toLowerCase())) {
      setAuthMessage("Account with this email already exists.")
      return
    }

    let nextCompany = company
    if (!company.created) {
      const selected = countries.find((item) => item.country === authForm.country)
      if (!selected) {
        setAuthMessage("Select country for company creation.")
        return
      }

      nextCompany = {
        created: true,
        name: "ReimburseX Labs",
        country: selected.country,
        currencyCode: selected.currencyCode,
        currencySymbol: selected.currencySymbol,
      }
      setCompany(nextCompany)
    }

    const newUser = {
      id: `USR-${Date.now()}`,
      name: authForm.name,
      email: authForm.email,
      password: authForm.password,
      role: authForm.role,
      department: authForm.role,
    }

    setUsers((prev) => [...prev, newUser])
    setCurrentUserId(newUser.id)
    setAuthMessage("")
    clearAuthForm()
  }

  const handleLogin = () => {
    const user = users.find(
      (item) =>
        item.email.toLowerCase() === authForm.email.toLowerCase() && item.password === authForm.password,
    )

    if (!user) {
      setAuthMessage("Invalid login credentials.")
      return
    }

    setCurrentUserId(user.id)
    setAuthMessage("")
    clearAuthForm()
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

  const handleManagerAction = (expenseId, status) => {
    setExpenses((prev) => prev.map((item) => (item.id === expenseId ? { ...item, status } : item)))
  }

  const handleSubmitExpense = (payload) => {
    if (!currentUser) {
      return
    }

    const newExpense = {
      id: `EXP-${Date.now()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      managerId: "USR-002",
      category: payload.category,
      description: payload.description,
      amountUsd: payload.amountUsd,
      status: "pending",
      submittedAt: new Date().toISOString().slice(0, 10),
    }

    setExpenses((prev) => [newExpense, ...prev])
  }

  const handleLogout = () => {
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
        expenses={expenses.filter((item) => item.employeeId !== currentUser.id)}
        approvalRules={approvalRules}
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
