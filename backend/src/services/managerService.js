import { env } from "../config/env.js"
import { db } from "../config/db.js"

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeExpense(row) {
  return {
    id: row.id,
    managerId: row.manager_id ?? null,
    employeeId: row.employee_id ?? null,
    employeeName: row.employee_name ?? row.employeeName ?? "Unknown Employee",
    description: row.description ?? "",
    category: row.category ?? "misc",
    status: row.status ?? "pending",
    submittedAt: row.submitted_at ?? row.submittedAt ?? new Date().toISOString(),
    amount: toNumber(row.amount, toNumber(row.amount_usd, 0)),
    amountUsd: toNumber(row.amount_usd, toNumber(row.amount, 0)),
    currency: row.currency_code ?? row.currency ?? "USD",
    companyId: row.company_id ?? null,
  }
}

function buildSort(sortBy, sortDir) {
  const allowed = new Set(["submitted_at", "amount_usd", "employee_name", "category", "status"])
  const dbSortBy = allowed.has(sortBy) ? sortBy : "submitted_at"
  const ascending = sortDir === "asc"
  return { dbSortBy, ascending }
}

function safeTable(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table name: ${name}`)
  }
  return name
}

const expensesTable = safeTable(env.tables.expenses)
const approvalRulesTable = safeTable(env.tables.approvalRules)
const usersTable = safeTable(env.tables.users)
const requestLogsTable = "expense_request_logs"

async function insertRequestLog({
  expenseId,
  actorUserId,
  actorRole,
  eventType,
  statusBefore = null,
  statusAfter = null,
  source = "manager-api",
  payload = {},
}) {
  await db.query(
    `
      INSERT INTO public.${requestLogsTable}
        (expense_id, actor_user_id, actor_role, event_type, status_before, status_after, source, payload, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, now())
    `,
    [
      expenseId,
      actorUserId,
      actorRole,
      eventType,
      statusBefore,
      statusAfter,
      source,
      JSON.stringify(payload || {}),
    ],
  )
}

function buildExpenseWhere({ managerId, companyId }) {
  const params = []
  const clauses = []

  if (managerId) {
    params.push(managerId)
    clauses.push(`manager_id = $${params.length}`)
  }

  if (companyId) {
    params.push(companyId)
    clauses.push(`company_id = $${params.length}`)
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""
  return { whereSql, params }
}

function buildManagerScope({ managerId, companyId, startIndex = 1 }) {
  const params = []
  const clauses = []
  let idx = startIndex

  if (managerId) {
    clauses.push(`(u.manager_id = $${idx++} OR u.manager_id IS NULL)`)
    params.push(managerId)
  }

  if (companyId) {
    clauses.push(`e.company_id = $${idx++}`)
    params.push(companyId)
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""
  return { whereSql, params, nextIndex: idx }
}

async function fetchManagerExpensesRaw({ managerId, companyId }) {
  const { whereSql, params } = buildManagerScope({ managerId, companyId })

  const sql = `
    SELECT e.id,
           u.manager_id,
           e.employee_id,
           u.name AS employee_name,
           e.description,
           e.category,
           e.status,
           e.submitted_at,
           e.amount,
           e.amount_usd,
           e.currency_code,
           e.company_id
    FROM ${expensesTable} e
    JOIN ${usersTable} u ON u.id = e.employee_id
    ${whereSql}
  `

  const result = await db.query(sql, params)
  return result.rows.map(normalizeExpense)
}

function filterExpenses(items, { search, status, category }) {
  return items.filter((item) => {
    const matchesSearch =
      !search ||
      item.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = !status || status === "all" || item.status === status
    const matchesCategory = !category || category === "all" || item.category.toLowerCase() === category.toLowerCase()

    return matchesSearch && matchesStatus && matchesCategory
  })
}

export async function getOverview({ managerId, companyId }) {
  const items = await fetchManagerExpensesRaw({ managerId, companyId })

  const pending = items.filter((item) => item.status === "pending").length
  const approved = items.filter((item) => item.status === "approved").length
  const escalated = items.filter((item) => item.status === "escalated").length
  const rejected = items.filter((item) => item.status === "rejected").length
  const totalAmountUsd = items.reduce((sum, item) => sum + item.amountUsd, 0)

  return {
    total: items.length,
    pending,
    approved,
    escalated,
    rejected,
    totalAmountUsd,
  }
}

export async function getExpenses({
  managerId,
  companyId,
  page = 1,
  pageSize = 10,
  search = "",
  status = "all",
  category = "all",
  sortBy = "submitted_at",
  sortDir = "desc",
}) {
  const items = await fetchManagerExpensesRaw({ managerId, companyId })
  const filtered = filterExpenses(items, { search, status, category })

  const { dbSortBy, ascending } = buildSort(sortBy, sortDir)

  filtered.sort((a, b) => {
    const left = a[dbSortBy === "submitted_at" ? "submittedAt" : dbSortBy === "amount_usd" ? "amountUsd" : dbSortBy === "employee_name" ? "employeeName" : dbSortBy]
    const right = b[dbSortBy === "submitted_at" ? "submittedAt" : dbSortBy === "amount_usd" ? "amountUsd" : dbSortBy === "employee_name" ? "employeeName" : dbSortBy]

    if (typeof left === "number" && typeof right === "number") {
      return ascending ? left - right : right - left
    }

    const leftStr = String(left || "").toLowerCase()
    const rightStr = String(right || "").toLowerCase()
    if (leftStr < rightStr) return ascending ? -1 : 1
    if (leftStr > rightStr) return ascending ? 1 : -1
    return 0
  })

  const safePage = Math.max(1, toNumber(page, 1))
  const safePageSize = Math.max(1, toNumber(pageSize, 10))
  const start = (safePage - 1) * safePageSize
  const paged = filtered.slice(start, start + safePageSize)

  return {
    data: paged,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / safePageSize)),
    },
  }
}

export async function getExpenseById({ expenseId, managerId, companyId }) {
  const params = [expenseId]
  const clauses = [`e.id = $1`]
  let next = 2

  if (managerId) {
    clauses.push(`(u.manager_id = $${next++} OR u.manager_id IS NULL)`)
    params.push(managerId)
  }

  if (companyId) {
    clauses.push(`e.company_id = $${next++}`)
    params.push(companyId)
  }

  const sql = `
    SELECT e.id,
           u.manager_id,
           e.employee_id,
           u.name AS employee_name,
           e.description,
           e.category,
           e.status,
           e.submitted_at,
           e.amount,
           e.amount_usd,
           e.currency_code,
           e.company_id
    FROM ${expensesTable} e
    JOIN ${usersTable} u ON u.id = e.employee_id
    WHERE ${clauses.join(" AND ")}
    LIMIT 1
  `

  const result = await db.query(sql, params)
  if (result.rows.length === 0) {
    const err = new Error("Expense not found or not allowed")
    err.statusCode = 404
    throw err
  }

  return normalizeExpense(result.rows[0])
}

export async function updateExpenseStatus({ expenseId, status, managerId, companyId, actorUserId, actorRole }) {
  const allowed = new Set(["approved", "rejected", "escalated", "pending"])
  if (!allowed.has(status)) {
    const err = new Error("Invalid status")
    err.statusCode = 400
    throw err
  }

  const before = await getExpenseById({ expenseId, managerId, companyId })

  const params = [status, expenseId]
  let scopeSql = ""
  if (managerId) {
    params.push(managerId)
    scopeSql += ` AND EXISTS (SELECT 1 FROM ${usersTable} u WHERE u.id = ${expensesTable}.employee_id AND (u.manager_id = $${params.length} OR u.manager_id IS NULL))`
  }
  if (companyId) {
    params.push(companyId)
    scopeSql += ` AND company_id = $${params.length}`
  }

  const sql = `
    UPDATE ${expensesTable}
    SET status = $1,
        resolved_at = CASE WHEN $1 IN ('approved', 'rejected') THEN now() ELSE resolved_at END
    WHERE id = $2${scopeSql}
    RETURNING id
  `

  const result = await db.query(sql, params)
  if (result.rows.length === 0) {
    const err = new Error("Expense not found or not allowed")
    err.statusCode = 404
    throw err
  }

  const updated = await getExpenseById({ expenseId, managerId, companyId })
  await insertRequestLog({
    expenseId,
    actorUserId: actorUserId || managerId,
    actorRole: actorRole || "manager",
    eventType: "status_changed",
    statusBefore: before.status,
    statusAfter: updated.status,
    payload: { description: updated.description, category: updated.category },
  })

  return updated
}

export async function updateBulkExpenseStatus({ expenseIds, status, managerId, companyId, actorUserId, actorRole }) {
  if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
    const err = new Error("expenseIds must be a non-empty array")
    err.statusCode = 400
    throw err
  }

  const allowed = new Set(["approved", "rejected", "escalated", "pending"])
  if (!allowed.has(status)) {
    const err = new Error("Invalid status")
    err.statusCode = 400
    throw err
  }

  const placeholders = expenseIds.map((_, idx) => `$${idx + 2}`).join(",")
  const params = [status, ...expenseIds]
  let scopeSql = ""

  if (managerId) {
    params.push(managerId)
    scopeSql += ` AND EXISTS (SELECT 1 FROM ${usersTable} u WHERE u.id = ${expensesTable}.employee_id AND (u.manager_id = $${params.length} OR u.manager_id IS NULL))`
  }

  if (companyId) {
    params.push(companyId)
    scopeSql += ` AND company_id = $${params.length}`
  }

  const sql = `
    UPDATE ${expensesTable}
    SET status = $1,
        resolved_at = CASE WHEN $1 IN ('approved', 'rejected') THEN now() ELSE resolved_at END
    WHERE id IN (${placeholders})${scopeSql}
    RETURNING id
  `

  const result = await db.query(sql, params)
  const updatedItems = await Promise.all(
    result.rows.map((row) => getExpenseById({ expenseId: row.id, managerId, companyId })),
  )

  await Promise.all(
    updatedItems.map((item) =>
      insertRequestLog({
        expenseId: item.id,
        actorUserId: actorUserId || managerId,
        actorRole: actorRole || "manager",
        eventType: "bulk_status_changed",
        statusAfter: item.status,
        payload: { bulk: true },
      }),
    ),
  )

  return updatedItems
}

export async function escalateOverdueExpenses({ managerId, companyId, actorUserId, actorRole }) {
  const rules = await getRules({ companyId })
  const params = [rules.escalateAfterDays]
  let scopeSql = ""

  if (managerId) {
    params.push(managerId)
    scopeSql += ` AND EXISTS (SELECT 1 FROM ${usersTable} u WHERE u.id = ${expensesTable}.employee_id AND (u.manager_id = $${params.length} OR u.manager_id IS NULL))`
  }

  if (companyId) {
    params.push(companyId)
    scopeSql += ` AND company_id = $${params.length}`
  }

  const sql = `
    UPDATE ${expensesTable}
    SET status = 'escalated'
    WHERE status = 'pending'
      AND submitted_at <= now() - ($1::int * interval '1 day')
      ${scopeSql}
    RETURNING id
  `

  const result = await db.query(sql, params)
  const updatedItems = await Promise.all(
    result.rows.map((row) => getExpenseById({ expenseId: row.id, managerId, companyId })),
  )

  await Promise.all(
    updatedItems.map((item) =>
      insertRequestLog({
        expenseId: item.id,
        actorUserId: actorUserId || managerId,
        actorRole: actorRole || "manager",
        eventType: "auto_escalated",
        statusAfter: item.status,
        payload: { thresholdDays: rules.escalateAfterDays },
      }),
    ),
  )

  return updatedItems
}

export async function getTeamSummary({ managerId, companyId }) {
  const items = await fetchManagerExpensesRaw({ managerId, companyId })
  const byEmployee = new Map()

  for (const item of items) {
    const current = byEmployee.get(item.employeeName) || {
      employeeName: item.employeeName,
      totalSpendUsd: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      escalated: 0,
    }

    current.totalSpendUsd += item.amountUsd
    if (item.status === "pending") current.pending += 1
    if (item.status === "approved") current.approved += 1
    if (item.status === "rejected") current.rejected += 1
    if (item.status === "escalated") current.escalated += 1

    byEmployee.set(item.employeeName, current)
  }

  return Array.from(byEmployee.values()).sort((a, b) => b.totalSpendUsd - a.totalSpendUsd)
}

export async function getRules({ companyId }) {
  const params = []
  let whereSql = ""

  if (companyId) {
    params.push(companyId)
    whereSql = `WHERE company_id = $${params.length}`
  }

  const sql = `
    SELECT id, company_id, escalate_after_days, min_approvals
    FROM ${approvalRulesTable}
    ${whereSql}
    ORDER BY id DESC
    LIMIT 1
  `

  const result = await db.query(sql, params)
  const row = result.rows[0]
  if (!row) {
    return {
      escalateAfterDays: 3,
      minApprovals: 1,
    }
  }

  return {
    id: row.id,
    companyId: row.company_id,
    escalateAfterDays: toNumber(row.escalate_after_days, 3),
    minApprovals: toNumber(row.min_approvals, 1),
  }
}
