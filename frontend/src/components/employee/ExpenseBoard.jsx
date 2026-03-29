import Panel from "../common/Panel"
import StatusPill from "../common/StatusPill"

function ExpenseBoard({ expenses }) {
  return (
    <Panel
      title="Employee dashboard"
      subtitle="Track draft, waiting approval, and approved expenses."
      className="table-panel"
    >
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Description</th>
            <th>Date</th>
            <th>Category</th>
            <th>Paid by</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td>{expense.employee}</td>
              <td>{expense.description}</td>
              <td>{expense.date}</td>
              <td>{expense.category}</td>
              <td>{expense.paidBy}</td>
              <td>{expense.amount}</td>
              <td>
                <StatusPill status={expense.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

export default ExpenseBoard
