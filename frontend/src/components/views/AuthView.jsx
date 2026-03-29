import CompanyRegistrationCard from "../auth/CompanyRegistrationCard"
import LoginCard from "../auth/LoginCard"
import EmployeeDirectoryTable from "../admin/EmployeeDirectoryTable"

function AuthView({ employees }) {
  return (
    <div className="view-grid auth-grid">
      <CompanyRegistrationCard />
      <LoginCard />
      <EmployeeDirectoryTable employees={employees} />
    </div>
  )
}

export default AuthView
