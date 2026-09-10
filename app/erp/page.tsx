import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import ErpModules from '@/components/erp-modules'
import AdvancedModules from '@/components/advanced-modules'
import ErpShell from '@/components/erp-shell'
import { getErpData } from '@/app/actions/erp'
import { getAdvancedData } from '@/app/actions/advanced'
import { getManagementData } from '@/app/actions/management'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ErpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  if ((session.user as { role?: string }).role === 'driver') redirect('/')
  const [management, data, advanced] = await Promise.all([getManagementData(), getErpData(), getAdvancedData()])
  return (
    <ErpShell role={(session.user as { role: 'admin' | 'accountant' }).role} userName={session.user.name}>
      <section id="operacao"><ErpModules fleet={management.fleet} team={management.team} data={data} role={(session.user as { role: 'admin' | 'accountant' }).role} /></section>
      <section id="analises"><AdvancedModules fleet={management.fleet} team={management.team} data={advanced} role={(session.user as { role: 'admin' | 'accountant' }).role} /></section>
    </ErpShell>
  )
}
