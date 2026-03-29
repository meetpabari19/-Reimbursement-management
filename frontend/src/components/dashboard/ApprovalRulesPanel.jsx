function ApprovalRulesPanel({ approvers }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Approval Rules</h2>
        <p>Configure dynamic approvers for each expense category</p>
      </div>

      <div className="rules-layout">
        <div>
          <label className="field-label" htmlFor="category">Expense category</label>
          <select id="category" defaultValue="Misc">
            <option>Misc</option>
            <option>Travel</option>
            <option>Food</option>
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="arrange">Arrange by</label>
          <select id="arrange" defaultValue="Seats">
            <option>Seats</option>
            <option>Alphabetical</option>
          </select>
        </div>
      </div>

      <div className="rules-users">
        <h3>Approvers</h3>
        {approvers.map((user) => (
          <label key={user.name} className="rule-item">
            <span>{user.name}</span>
            <input type="checkbox" defaultChecked={user.required} />
          </label>
        ))}
      </div>

      <div className="rules-footer">
        <label className="rule-item inline">
          <span>Approval sequence</span>
          <input type="checkbox" />
        </label>

        <label className="field-inline">
          Minimum approvals
          <input type="number" defaultValue="1" min="1" max="3" />
        </label>
      </div>

      <button type="button" className="btn primary">Save Rule</button>
    </section>
  )
}

export default ApprovalRulesPanel
