import ApprovalRuleCard from "../admin/ApprovalRuleCard"

function AdminView({ approvers }) {
  return (
    <div className="view-grid">
      <ApprovalRuleCard approvers={approvers} />
    </div>
  )
}

export default AdminView
