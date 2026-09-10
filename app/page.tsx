import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'

export default async function Page() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')
  redirect('/erp')
}
