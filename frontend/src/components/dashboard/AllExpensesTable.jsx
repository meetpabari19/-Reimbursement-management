function AllExpensesTable({ expenses }) {
  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <h2>All Expenses</h2>
        <p>Complete list of submitted expenses</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Expense Id</th>
            <th>Employee</th>
            <th>Description</th>
            <th>Category</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.employee}</td>
              <td>{item.description}</td>
              <td>{item.category}</td>
              <td>{item.date}</td>
              <td>{item.convertedAmount}</td>
              <td>
                <span className={item.status === "Approved" ? "chip ok" : "chip warn"}>
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default AllExpensesTable
