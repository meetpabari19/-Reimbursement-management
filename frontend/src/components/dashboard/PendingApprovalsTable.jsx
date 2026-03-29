function PendingApprovalsTable({ approvals }) {
  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <h2>Approvals to Review</h2>
        <p>Approve or reject submitted expenses</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Approval Id</th>
            <th>Requestor</th>
            <th>Category</th>
            <th>Status</th>
            <th>Total</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.requestor}</td>
              <td>{item.category}</td>
              <td>
                <span className={item.status === "Approved" ? "chip ok" : "chip warn"}>
                  {item.status}
                </span>
              </td>
              <td>{item.convertedTotal}</td>
              <td>
                <div className="table-actions">
                  <button type="button" className="btn ghost success">Approve</button>
                  <button type="button" className="btn ghost danger">Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default PendingApprovalsTable
