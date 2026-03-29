import Panel from "../common/Panel"

function ExpenseFormCard() {
  return (
    <Panel title="Add new expense" subtitle="Submit once complete, then it moves to manager queue.">
      <form className="grid-form">
        <label>
          Attach receipt
          <input type="file" />
        </label>
        <label>
          Expense date
          <input type="date" defaultValue="2026-10-02" />
        </label>
        <label>
          Category
          <select defaultValue="Food">
            <option>Food</option>
            <option>Travel</option>
            <option>Misc</option>
          </select>
        </label>
        <label>
          Paid by
          <select defaultValue="Surbhi">
            <option>Surbhi</option>
            <option>Arihant</option>
            <option>Andrea</option>
          </select>
        </label>
        <label className="span-2">
          Description
          <textarea rows="3" placeholder="Expense details" defaultValue="Restaurant bill" />
        </label>
        <button type="button" className="line-btn">
          Submit
        </button>
      </form>
      <div className="history-strip">
        <h3>Latest action</h3>
        <p>Surbhi approved this expense on 02 Oct, 2026 at 10:49 PM.</p>
      </div>
    </Panel>
  )
}

export default ExpenseFormCard
