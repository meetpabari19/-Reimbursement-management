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
  initialApprovalRules,
} from "./data/mockData"
import { supabase } from "./utils/supabase"
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
  const [directoryUsers, setDirectoryUsers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [approvalRules, setApprovalRules] = useState(initialApprovalRules)
  const [currentUserId, setCurrentUserId] = useState(null)

  const [countries, setCountries] = useState([])
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [rates, setRates] = useState({ USD: 1 })

  const isUuid = (value) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

  const fetchUsersFromDb = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role, department, manager_id, is_active")
      .order("name", { ascending: true })

    if (error) {
      throw error
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name || "Unknown",
      email: row.email || "",
      role: row.role || "employee",
      department: row.department || row.role || "employee",
      managerId: row.manager_id || null,
      isActive: row.is_active,
    }))
  }

  const fetchExpensesFromDb = async () => {
    const [
      { data: expenseRows, error: expenseError },
      { data: userRows, error: userError },
      { data: managerLogRows, error: managerLogError },
    ] =
      await Promise.all([
        supabase
          .from("expenses")
          .select("id, employee_id, category, description, amount, amount_usd, status, submitted_at")
          .order("submitted_at", { ascending: false }),
        supabase.from("users").select("id, name, manager_id"),
        supabase
          .from("expense_request_logs")
          .select("expense_id, actor_role, event_type, status_after, created_at")
          .order("created_at", { ascending: false }),
      ])

    if (expenseError) {
      throw expenseError
    }

    if (userError) {
      console.warn("Could not load users for expense names:", userError.message)
    }

    if (managerLogError) {
      console.warn("Could not load manager request logs:", managerLogError.message)
    }

    const userMap = new Map((userRows || []).map((row) => [row.id, row]))
    const latestManagerLogByExpense = new Map()
    ;(managerLogRows || [])
      .filter((row) => {
        const role = (row.actor_role || "").trim().toLowerCase()
        const eventType = (row.event_type || "").trim().toLowerCase()
        return role === "manager" && eventType === "status_changed"
      })
      .forEach((row) => {
      if (!latestManagerLogByExpense.has(row.expense_id)) {
        latestManagerLogByExpense.set(row.expense_id, row)
      }
      })

    return (expenseRows || []).map((exp) => {
      const managerLog = latestManagerLogByExpense.get(exp.id)
      const managerDecision = managerLog?.status_after || null
      const employee = userMap.get(exp.employee_id)
      const cleanedEmployeeName =
        (employee?.name || "Unknown Employee").replace(/\s*\([^)]*\)\s*/g, " ").trim() ||
        "Unknown Employee"

      return {
        id: exp.id,
        employeeId: exp.employee_id,
        employeeName: cleanedEmployeeName,
        managerId: employee?.manager_id || null,
        category: exp.category || "Other",
        description: exp.description || "",
        amountUsd: Number(exp.amount_usd ?? exp.amount ?? 0),
        status: exp.status,
        submittedAt: exp.submitted_at,
        managerDecision,
        managerDecisionAt: managerLog?.created_at || null,
      }
    })
  }

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

  useEffect(() => {
    let mounted = true

    async function loadUsers() {
      try {
        const dbUsers = await fetchUsersFromDb()
        if (mounted) {
          setDirectoryUsers(dbUsers)
        }
      } catch (error) {
        console.error("Failed to load users from DB:", error.message || error)
        if (mounted) {
          setDirectoryUsers([])
        }
        window.alert(`Could not load users table: ${error.message || error}`)
      }
    }

    loadUsers()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadExpenses() {
      try {
        const formattedExpenses = await fetchExpensesFromDb()
        if (mounted) {
          setExpenses(formattedExpenses)
        }
      } catch (error) {
        console.error("Failed to load expenses from DB:", error.message || error)
        if (mounted) {
          setExpenses([])
        }
      }
    }

    loadExpenses()

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
    setDirectoryUsers((prev) => [...prev, newUser])
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

  const handleRoleChange = async (userId, role) => {
    if (isUuid(userId)) {
      const { error } = await supabase
        .from("users")
        .update({ role, department: role })
        .eq("id", userId)

      if (error) {
        window.alert(`Could not update user role: ${error.message}`)
        return
      }
    }

    setDirectoryUsers((prev) =>
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

  const handleOverrideStatus = async (expenseId, status) => {
    if (!currentUser) return

    if (!isUuid(expenseId)) {
      window.alert("This row is not a DB expense (invalid UUID). Please refresh and use DB-loaded rows.")
      return
    }

    try {
      const actionMap = {
        approved: "approved",
        rejected: "rejected",
        escalated: "escalated",
      }
      const action = actionMap[status]
      if (!action) {
        console.error("Invalid status action:", status)
        return
      }

      const approverId = isUuid(currentUser.id) ? currentUser.id : null
      const targetExpense = expenses.find((item) => item.id === expenseId)
      const normalizedExpenseStatus = status === "approved" || status === "rejected" ? status : "pending"

      const { error: approvalInsertError } = await supabase.from("expense_approvals").insert({
        expense_id: expenseId,
        approver_id: approverId,
        action,
        step_order: 1,
        comment: `Approval action: ${action}`,
      })
      if (approvalInsertError) {
        console.error("Failed to insert expense approval:", approvalInsertError.message)
        window.alert(`Could not write to expense_approvals: ${approvalInsertError.message}`)
        return
      }

      const { error: requestLogError } = await supabase.from("expense_request_logs").insert({
        expense_id: expenseId,
        actor_user_id: approverId,
        actor_role: "admin",
        event_type: "status_changed",
        status_before: targetExpense?.status || null,
        status_after: status,
        source: "admin-dashboard",
        payload: {
          category: targetExpense?.category || null,
          description: targetExpense?.description || null,
        },
      })
      if (requestLogError) {
        console.error("Failed to write admin request log:", requestLogError.message)
        window.alert(`Could not write to expense_request_logs: ${requestLogError.message}`)
        return
      }

      const { error: expenseUpdateError } = await supabase
        .from("expenses")
        .update({ status: normalizedExpenseStatus })
        .eq("id", expenseId)
      if (expenseUpdateError) {
        console.error("Failed to update expense status:", expenseUpdateError.message)
        window.alert(`Could not update expense status: ${expenseUpdateError.message}`)
        return
      }

      const refreshedExpenses = await fetchExpensesFromDb()
      setExpenses(refreshedExpenses)
    } catch (error) {
      console.error("Error updating expense status:", error)
    }
  }

  const handleManagerAction = async (expenseId, status) => {
    if (!currentUser) return

    if (!isUuid(expenseId)) {
      window.alert("This row is not a DB expense (invalid UUID). Please refresh and use DB-loaded rows.")
      return
    }

    const targetExpense = expenses.find((item) => item.id === expenseId)
    const actorUserId = isUuid(currentUser.id) ? currentUser.id : null
    const normalizedExpenseStatus = status === "approved" || status === "rejected" ? status : "pending"

    try {
      const { error: managerLogError } = await supabase.from("expense_request_logs").insert({
        expense_id: expenseId,
        actor_user_id: actorUserId,
        actor_role: "manager",
        event_type: "status_changed",
        status_before: targetExpense?.status || null,
        status_after: status,
        source: "manager-dashboard",
        payload: {
          category: targetExpense?.category || null,
          description: targetExpense?.description || null,
        },
      })
      if (managerLogError) {
        console.error("Failed to write manager request log:", managerLogError.message)
        window.alert(`Could not write to expense_request_logs: ${managerLogError.message}`)
        return
      }

      const { error: expenseUpdateError } = await supabase
        .from("expenses")
        .update({ status: normalizedExpenseStatus })
        .eq("id", expenseId)
      if (expenseUpdateError) {
        console.error("Failed to update expense status from manager action:", expenseUpdateError.message)
        window.alert(`Could not update expense status: ${expenseUpdateError.message}`)
        return
      }

      const refreshedExpenses = await fetchExpensesFromDb()
      setExpenses(refreshedExpenses)
    } catch (error) {
      console.error("Error applying manager action:", error)
      window.alert("Manager action failed. Check console for details.")
    }
  }

  const handleSubmitExpense = async (payload) => {
    if (!currentUser) {
      return
    }

    if (!isUuid(currentUser.id)) {
      window.alert("Employee submission requires DB-authenticated user id (UUID).")
      return
    }

    const { error: insertError } = await supabase.from("expenses").insert({
      employee_id: currentUser.id,
      category: payload.category,
      description: payload.description,
      amount: Number(payload.amountUsd),
      amount_usd: Number(payload.amountUsd),
      currency_code: "USD",
      date: new Date().toISOString().slice(0, 10),
      status: "pending",
    })

    if (insertError) {
      window.alert(`Could not submit expense: ${insertError.message}`)
      return
    }

    const refreshedExpenses = await fetchExpensesFromDb()
    setExpenses(refreshedExpenses)
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
        users={directoryUsers}
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
    const managerExpenses = isUuid(currentUser.id)
      ? expenses.filter((item) => item.managerId === currentUser.id)
      : expenses.filter((item) => item.employeeId !== currentUser.id)

    return (
      <ManagerDashboard
        user={currentUser}
        company={company}
        expenses={managerExpenses}
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
