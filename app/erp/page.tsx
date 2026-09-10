import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import ErpModules from '@/components/erp-modules'
import { getErpData } from '@/app/actions/erp'
import { getManagementData } from '@/app/actions/management'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ErpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const [management, data] = await Promise.all([getManagementData(), getErpData()])
  return <ErpModules fleet={management.fleet} team={management.team} data={data} />
}
