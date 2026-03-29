import ExpenseBoard from "../employee/ExpenseBoard"
import ExpenseFormCard from "../employee/ExpenseFormCard"

function EmployeeView({ expenses }) {
  return (
    <div className="view-grid employee-grid">
      <ExpenseBoard expenses={expenses} />
      <ExpenseFormCard />
    </div>
  )
}

export default EmployeeView
