export function notFoundHandler(req, res) {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  })
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500
  let message = err.message || "Internal server error"

  if (message.includes("Tenant or user not found") || message.includes("ENOTFOUND")) {
    message = "Database connection failed. Update DATABASE_URL using the exact string from Supabase Connect -> Transaction pooler."
  }

  res.status(status).json({
    message,
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  })
}
