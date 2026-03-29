function ManagerDashboard({ user, company, expenses, approvalRules, formatMoney, onManagerAction, onLogout }) {
  return (
    <div className="dash-layout manager-dash">
      <header className="dash-header">
        <div>
          <p className="eyebrow">Manager Dashboard</p>
          <h1>{user.name}</h1>
          <p className="meta">Team approvals in company default currency: {company.currencyCode}</p>
        </div>
        <button type="button" className="ghost-btn" onClick={onLogout}>
          Logout
        </button>
      </header>

      <section className="metric-row metric-row-2">
        <article className="metric-card">
          <h3>Pending approvals</h3>
          <p>{expenses.filter((item) => item.status === "pending").length}</p>
        </article>
        <article className="metric-card">
          <h3>Escalation threshold</h3>
          <p>{approvalRules.escalateAfterDays} days</p>
        </article>
      </section>

      <section className="panel">
        <h2>Team expenses</h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Description</th>
                <th>Category</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.employeeName}</td>
                  <td>{expense.description}</td>
                  <td>{expense.category}</td>
                  <td className={`chip ${expense.status}`}>{expense.status}</td>
                  <td>{formatMoney(expense.amountUsd)}</td>
                  <td className="row-actions">
                    <button type="button" className="ok" onClick={() => onManagerAction(expense.id, "approved")}>Approve</button>
                    <button type="button" className="bad" onClick={() => onManagerAction(expense.id, "rejected")}>Reject</button>
                    <button type="button" className="soft" onClick={() => onManagerAction(expense.id, "escalated")}>Escalate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default ManagerDashboard
