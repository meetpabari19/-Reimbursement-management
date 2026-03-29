import ApprovalsTable from "../manager/ApprovalsTable"

function ManagerView({ approvals }) {
  return (
    <div className="view-grid">
      <ApprovalsTable approvals={approvals} />
    </div>
  )
}

export default ManagerView
