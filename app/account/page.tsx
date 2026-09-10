import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import AccountSecurity from '@/components/account-security'
import { auth } from '@/lib/auth'

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  return <main className="min-h-screen bg-background p-6 text-foreground"><div className="mx-auto max-w-3xl"><a className="text-button" href="/">← Voltar ao painel</a><div className="mt-6"><AccountSecurity initialName={session.user.name} /></div></div></main>
}
