import Panel from "../common/Panel"

function ApprovalRuleCard({ approvers }) {
  return (
    <Panel
      title="Approval rule for miscellaneous expenses"
      subtitle="Select approvers and set minimum required approvals."
      className="rule-panel"
    >
      <div className="rule-toolbar">
        <label>
          Arrange
          <select defaultValue="seats">
            <option value="seats">Seats</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Required</th>
          </tr>
        </thead>
        <tbody>
          {approvers.map((person) => (
            <tr key={person.name}>
              <td>{person.name}</td>
              <td>
                <input type="checkbox" defaultChecked={person.required} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rule-summary">
        <label>
          Approval sequence
          <input type="checkbox" />
        </label>
        <label>
          Minimum approvals
          <input type="number" min="1" max="3" defaultValue="2" />
        </label>
      </div>
    </Panel>
  )
}

export default ApprovalRuleCard
