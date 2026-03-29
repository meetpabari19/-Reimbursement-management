import Panel from "../common/Panel"

function ApprovalsTable({ approvals }) {
  return (
    <Panel
      title="Approvals to review"
      subtitle="Expense requests that need manager action."
      className="table-panel"
    >
      <table>
        <thead>
          <tr>
            <th>Approval id</th>
            <th>Requestor</th>
            <th>Category</th>
            <th>Request status</th>
            <th>Total amount</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.requestor}</td>
              <td>{item.category}</td>
              <td>{item.status}</td>
              <td>{item.total}</td>
              <td>
                <div className="action-buttons">
                  <button type="button" className="line-btn small success">
                    Approve
                  </button>
                  <button type="button" className="line-btn small danger">
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

export default ApprovalsTable
