import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'

export type UserRole = 'admin' | 'accountant' | 'driver'

function normalizeRole(value: unknown): UserRole {
  if (value === 'contador' || value === 'accountant') return 'accountant'
  if (value === 'funcionario' || value === 'funcionário' || value === 'driver') return 'driver'
  return 'admin'
}

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const [record] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  const role = normalizeRole(record?.role)
  return { ...session.user, role } as typeof session.user & { role: UserRole }
}
