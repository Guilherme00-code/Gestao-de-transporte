import { redirect } from 'next/navigation'
import ErpModules from '@/components/erp-modules'
import AdvancedModules from '@/components/advanced-modules'
import ErpShell from '@/components/erp-shell'
import EmployeeDashboard from '@/components/employee-dashboard'
import { getErpData } from '@/app/actions/erp'
import { getAdvancedData } from '@/app/actions/advanced'
import { getManagementData } from '@/app/actions/management'
import { getCurrentUser } from '@/lib/current-user'

export const dynamic = 'force-dynamic'

export default async function ErpPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')
  const [management, data, advanced] = await Promise.all([getManagementData(), getErpData(), getAdvancedData()])
  if (user.role === 'driver') {
    return <EmployeeDashboard userName={user.name} fleet={management.fleet} operations={management.operations} />
  }
  return (
    <ErpShell role={user.role} userName={user.name}>
      <section id="operacao"><ErpModules fleet={management.fleet} team={management.team} data={data} role={user.role} /></section>
      <section id="analises"><AdvancedModules fleet={management.fleet} team={management.team} data={advanced} role={user.role} /></section>
    </ErpShell>
  )
}
