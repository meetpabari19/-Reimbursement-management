import { Router } from "express"
import { db } from "../config/db.js"
import { env } from "../config/env.js"
import { asyncHandler } from "../middleware/asyncHandler.js"

function safeTable(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table name: ${name}`)
  }
  return name
}

function normalizeCategory(value) {
  const raw = String(value || "misc").toLowerCase().trim()
  if (raw === "food" || raw === "travel" || raw === "misc" || raw === "other") {
    return raw
  }
  return "misc"
}

const usersTable = safeTable(env.tables.users)
const expensesTable = safeTable(env.tables.expenses)
const approvalRulesTable = safeTable(env.tables.approvalRules)
const requestLogsTable = "expense_request_logs"

function toNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeExpense(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name || "Unknown Employee",
    description: row.description,
    category: row.category,
    status: row.status,
    submittedAt: row.submitted_at,
    amount: toNumber(row.amount, 0),
    amountUsd: toNumber(row.amount_usd, toNumber(row.amount, 0)),
    currency: row.currency_code || "USD",
    companyId: row.company_id,
    ruleSetId: row.rule_set_id || null,
    receiptUrl: row.receipt_url || null,
    ocrRaw: row.ocr_raw || {},
    currentStep: toNumber(row.current_step, 1),
    resolvedAt: row.resolved_at || null,
    createdAt: row.created_at || null,
  }
}

async function resolveManagerForEmployee({ companyId, managerId }) {
  if (managerId) {
    const managerCheck = await db.query(
      `
        SELECT id
        FROM ${usersTable}
        WHERE id = $1 AND role = 'manager' AND company_id = $2
        LIMIT 1
      `,
      [managerId, companyId],
    )
    if (managerCheck.rows.length > 0) {
      return managerId
    }
  }

  const managerResult = await db.query(
    `
      SELECT id
      FROM ${usersTable}
      WHERE role = 'manager' AND company_id = $1
      ORDER BY created_at ASC NULLS LAST, id ASC
      LIMIT 1
    `,
    [companyId],
  )

  return managerResult.rows[0]?.id || null
}

async function insertRequestLog({
  expenseId,
  actorUserId,
  actorRole,
  eventType,
  statusBefore = null,
  statusAfter = null,
  source = "employee-submit-api",
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

export const expenseRouter = Router()

expenseRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const requester = req.user
    const page = Math.max(1, toNumber(req.query.page, 1))
    const pageSize = Math.max(1, Math.min(500, toNumber(req.query.pageSize, 100)))
    const offset = (page - 1) * pageSize

    const where = []
    const params = []

    if (requester.role === "employee") {
      params.push(requester.id)
      where.push(`e.employee_id = $${params.length}`)
    } else if (requester.role === "manager") {
      if (requester.companyId) {
        params.push(requester.companyId)
        where.push(`e.company_id = $${params.length}`)
      }
    } else if (requester.role === "admin") {
      if (requester.companyId) {
        params.push(requester.companyId)
        where.push(`e.company_id = $${params.length}`)
      }
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""

    const countSql = `
      SELECT count(*)::int AS total
      FROM ${expensesTable} e
      JOIN ${usersTable} u ON u.id = e.employee_id
      ${whereSql}
    `

    const countResult = await db.query(countSql, params)
    const total = countResult.rows[0]?.total || 0

    const listParams = [...params, pageSize, offset]
    const listSql = `
      SELECT e.id,
             e.company_id,
             e.employee_id,
             u.name AS employee_name,
             e.description,
             e.category,
             e.status,
             e.submitted_at,
             e.amount,
             e.amount_usd,
             e.currency_code,
             e.rule_set_id,
             e.receipt_url,
             e.ocr_raw,
             e.current_step,
             e.resolved_at,
             e.created_at
      FROM ${expensesTable} e
      JOIN ${usersTable} u ON u.id = e.employee_id
      ${whereSql}
      ORDER BY e.submitted_at DESC NULLS LAST, e.created_at DESC NULLS LAST
      LIMIT $${listParams.length - 1}
      OFFSET $${listParams.length}
    `

    const listResult = await db.query(listSql, listParams)

    res.json({
      data: listResult.rows.map(normalizeExpense),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    })
  }),
)

expenseRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const requester = req.user
    const payload = req.body || {}

    const amountUsd = Number(payload.amountUsd)
    const amount = Number(payload.amount || payload.amountUsd)
    const description = String(payload.description || "").trim()

    if (!description || !Number.isFinite(amountUsd) || amountUsd <= 0) {
      return res.status(400).json({
        message: "description and positive amountUsd are required",
      })
    }

    let employeeId = payload.employeeId
    if (requester.role === "employee") {
      employeeId = requester.id
    }

    if (!employeeId) {
      return res.status(400).json({
        message: "employeeId is required for non-employee callers",
      })
    }

    const employeeResult = await db.query(
      `
        SELECT id, company_id, manager_id, name
        FROM ${usersTable}
        WHERE id = $1
        LIMIT 1
      `,
      [employeeId],
    )

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" })
    }

    const employee = employeeResult.rows[0]

    if (requester.role === "employee" && String(employee.id) !== String(requester.id)) {
      return res.status(403).json({ message: "Employees can submit only their own requests" })
    }

    let effectiveManagerId = employee.manager_id || null
    if (!effectiveManagerId) {
      effectiveManagerId = await resolveManagerForEmployee({
        companyId: employee.company_id,
        managerId: null,
      })

      if (effectiveManagerId) {
        await db.query(
          `UPDATE ${usersTable} SET manager_id = $1 WHERE id = $2`,
          [effectiveManagerId, employee.id],
        )
      }
    }

    let ruleSetId = payload.ruleSetId || null
    if (!ruleSetId) {
      const rulesResult = await db.query(
        `
          SELECT id
          FROM ${approvalRulesTable}
          WHERE company_id = $1
          ORDER BY created_at DESC NULLS LAST, id DESC
          LIMIT 1
        `,
        [employee.company_id],
      )
      ruleSetId = rulesResult.rows[0]?.id || null
    }

    const inserted = await db.query(
      `
        INSERT INTO ${expensesTable}
          (company_id, employee_id, rule_set_id, category, description, amount, currency_code, amount_usd, date, status, receipt_url, ocr_raw, current_step, submitted_at, created_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, current_date, 'pending', $9, $10::jsonb, $11, now(), now())
        RETURNING id, company_id, employee_id, rule_set_id, category, description, amount, currency_code, amount_usd, status, receipt_url, ocr_raw, current_step, submitted_at, created_at
      `,
      [
        employee.company_id,
        employee.id,
        ruleSetId,
        normalizeCategory(payload.category),
        description,
        Number.isFinite(amount) && amount > 0 ? amount : amountUsd,
        String(payload.currencyCode || "INR").toUpperCase(),
        amountUsd,
        payload.receiptUrl || null,
        JSON.stringify(payload.ocrRaw || {}),
        Number.isFinite(Number(payload.currentStep)) ? Number(payload.currentStep) : 1,
      ],
    )

    await insertRequestLog({
      expenseId: inserted.rows[0].id,
      actorUserId: requester.id,
      actorRole: requester.role,
      eventType: "request_submitted",
      statusAfter: "pending",
      payload: {
        description,
        category: normalizeCategory(payload.category),
        amountUsd,
        receiptUrl: payload.receiptUrl || null,
        ocrRaw: payload.ocrRaw || {},
        currentStep: Number.isFinite(Number(payload.currentStep)) ? Number(payload.currentStep) : 1,
      },
    })

    res.status(201).json(inserted.rows[0])
  }),
)
