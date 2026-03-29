function StatusPill({ status }) {
  const normalized = status.toLowerCase()

  return (
    <span className={`status-pill status-${normalized.replace(/\s+/g, "-")}`}>
      {status}
    </span>
  )
}

export default StatusPill
