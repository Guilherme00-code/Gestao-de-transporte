import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/dashboard'
import { getManagementData } from '@/app/actions/management'
import { auth } from '@/lib/auth'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const role = (session.user as { role?: string }).role
  const initialRole = role === 'driver' ? 'Funcionário' : role === 'accountant' ? 'Contador' : 'Administrador'
  const data = await getManagementData()
  return <Dashboard initialRole={initialRole} userName={session.user.name} fleet={data.fleet} team={data.team} operations={data.operations} />
}
