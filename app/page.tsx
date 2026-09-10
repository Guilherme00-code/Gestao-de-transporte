import { redirect } from 'next/navigation'
import Dashboard from '@/components/dashboard'
import EmployeeDashboard from '@/components/employee-dashboard'
import { getManagementData } from '@/app/actions/management'
import { getCurrentUser } from '@/lib/current-user'

export default async function Page() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')
  const role = user.role
  const initialRole = role === 'driver' ? 'Funcionário' : role === 'accountant' ? 'Contador' : 'Administrador'
  const data = await getManagementData()
  if (role === 'driver') return <EmployeeDashboard userName={user.name} fleet={data.fleet} operations={data.operations} />
  return <Dashboard initialRole={initialRole} userName={user.name} fleet={data.fleet} team={data.team} operations={data.operations} />
}
