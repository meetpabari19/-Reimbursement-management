import jwt from "jsonwebtoken"
import { env } from "../config/env.js"

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: "Missing bearer token" })
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}

export function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" })
    }
    return next()
  }
}
