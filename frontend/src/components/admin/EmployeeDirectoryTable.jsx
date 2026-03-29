import Panel from "../common/Panel"

function EmployeeDirectoryTable({ employees }) {
  return (
    <Panel title="Employees" subtitle="Auto-created after company registration." className="table-panel">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Email</th>
            <th>Password</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.name}</td>
              <td>{employee.role}</td>
              <td>{employee.email}</td>
              <td>{employee.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

export default EmployeeDirectoryTable
