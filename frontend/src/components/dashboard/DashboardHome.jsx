import StatCard from "./StatCard"

function DashboardHome({ stats, employees, managers, activities }) {
  return (
    <section className="content-stack">
      <div className="stats-grid">
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          helper="Requires your action"
          accent="amber"
        />
        <StatCard
          title="All Pending"
          value={stats.allPending}
          helper="In approval process"
          accent="slate"
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          helper="Successfully processed"
          accent="green"
        />
        <StatCard
          title="Total Amount"
          value={stats.totalAmount}
          helper="Approved expenses"
          accent="emerald"
        />
      </div>

      <section className="panel wide">
        <div className="panel-header">
          <h2>Total Users</h2>
        </div>
        <p className="large-number">{employees + managers}</p>
        <p className="muted">Employees: {employees}   Managers: {managers}</p>
      </section>

      <section className="panel recent-panel">
        <div className="panel-header">
          <h2>Recent Activity</h2>
          <p>Latest expense submissions and approvals</p>
        </div>
        {activities.length === 0 ? (
          <div className="empty-state">No expenses yet</div>
        ) : (
          <ul className="activity-list">
            {activities.map((item) => (
              <li key={item.id}>
                <span>{item.date}</span>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}

export default DashboardHome
