import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { randomUUID } from "node:crypto"
import { db } from "../config/db.js"
import { env } from "../config/env.js"

function safeTable(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table name: ${name}`)
  }
  return name
}

const usersTable = safeTable(env.tables.users)
const companiesTable = safeTable(env.tables.companies)

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

function toUserDto(row) {
  return {
    id: row.id,
    companyId: row.company_id,
    managerId: row.manager_id,
    name: row.name,
    email: row.email,
    role: row.role,
  }
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    env.jwtSecret,
    { expiresIn: "7d" },
  )
}

export async function signup({ name, email, password, role = "employee", companyId = null, managerId = null }) {
  if (!name || !email || !password) {
    const err = new Error("name, email and password are required")
    err.statusCode = 400
    throw err
  }

  if (password.length < 6) {
    const err = new Error("Password must be at least 6 characters")
    err.statusCode = 400
    throw err
  }

  const allowedRoles = new Set(["admin", "manager", "employee"])
  if (!allowedRoles.has(role)) {
    const err = new Error("Invalid role")
    err.statusCode = 400
    throw err
  }

  let resolvedCompanyId = companyId

  if (!resolvedCompanyId) {
    const existingCompany = await db.query(`SELECT id FROM ${companiesTable} ORDER BY created_at ASC NULLS LAST, id ASC LIMIT 1`)
    if (existingCompany.rows.length > 0) {
      resolvedCompanyId = existingCompany.rows[0].id
    }
  }

  if (!resolvedCompanyId) {
    const createdCompany = await db.query(
      `
        INSERT INTO ${companiesTable} (name, country, currency_code)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      ["ReimburseX Labs", "India", "INR"],
    )
    resolvedCompanyId = createdCompany.rows[0].id
  }

  const existing = await db.query(`SELECT id FROM ${usersTable} WHERE lower(email) = lower($1) LIMIT 1`, [email])
  if (existing.rows.length > 0) {
    const err = new Error("Email already exists")
    err.statusCode = 409
    throw err
  }

  const passwordHash = await bcrypt.hash(password, 10)

  let resolvedManagerId = managerId
  if (role === "employee") {
    resolvedManagerId = await resolveManagerForEmployee({
      companyId: resolvedCompanyId,
      managerId,
    })
  }

  const result = await db.query(
    `
      INSERT INTO ${usersTable} (id, company_id, manager_id, name, email, role, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, company_id, manager_id, name, email, role
    `,
    [randomUUID(), resolvedCompanyId, resolvedManagerId, name, email, role, passwordHash],
  )

  const user = toUserDto(result.rows[0])
  const token = signToken(user)

  return {
    token,
    user,
  }
}

export async function login({ email, password }) {
  if (!email || !password) {
    const err = new Error("email and password are required")
    err.statusCode = 400
    throw err
  }

  const result = await db.query(
    `
      SELECT id, company_id, manager_id, name, email, role, password_hash
      FROM ${usersTable}
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [email],
  )

  if (result.rows.length === 0) {
    const err = new Error("Invalid email or password")
    err.statusCode = 401
    throw err
  }

  const row = result.rows[0]
  const isValid = await bcrypt.compare(password, row.password_hash || "")
  if (!isValid) {
    const err = new Error("Invalid email or password")
    err.statusCode = 401
    throw err
  }

  const user = toUserDto(row)
  const token = signToken(user)

  return {
    token,
    user,
  }
}
