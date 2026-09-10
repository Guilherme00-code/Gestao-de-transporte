import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import ErpModules from '@/components/erp-modules'
import { getErpData } from '@/app/actions/erp'
import { getManagementData } from '@/app/actions/management'
import { auth } from '@/lib/auth'
import { getAdvancedData } from '@/app/actions/advanced'
import AdvancedModules from '@/components/advanced-modules'

export const dynamic = 'force-dynamic'

export default async function ErpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const [management, data, advanced] = await Promise.all([getManagementData(), getErpData(), getAdvancedData()])
  return (
    <>
      <ErpModules fleet={management.fleet} team={management.team} data={data} />
      <AdvancedModules fleet={management.fleet} team={management.team} data={advanced} />
    </>
  )
}
