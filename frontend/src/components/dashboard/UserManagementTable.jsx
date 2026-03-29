function UserManagementTable({ employees }) {
  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <h2>User Management</h2>
        <p>Users available in this workspace</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>User Id</th>
            <th>Name</th>
            <th>Role</th>
            <th>Email</th>
            <th>Password</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>{item.role}</td>
              <td>{item.email}</td>
              <td>{item.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default UserManagementTable
