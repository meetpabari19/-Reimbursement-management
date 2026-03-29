function StatCard({ title, value, helper, accent = "blue" }) {
  return (
    <article className={`stat-card accent-${accent}`}>
      <p className="stat-title">{title}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-helper">{helper}</p>
    </article>
  )
}

export default StatCard
