'use server'

import { and, desc, eq, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  alertRules,
  benchmarks,
  incidents,
  notifications,
  preventiveMaintenanceRules,
} from '@/lib/db/schema'

async function getContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Não autorizado')
  const role = (session.user as { role?: string }).role ?? 'driver'
  return { userId: session.user.id, role }
}

function companyOnly(role: string) {
  if (role === 'driver') throw new Error('Acesso restrito ao administrador ou contador')
}

function required(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} é obrigatório`)
  return normalized
}

function validDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} inválida`)
  return new Date(`${value}T00:00:00`)
}

export async function getAdvancedData() {
  const { userId, role } = await getContext()
  const scope = role === 'admin' || role === 'accountant' ? undefined : eq(preventiveMaintenanceRules.userId, userId)
  const [preventive, benchmarkRows, incidentRows, notificationRows, rules] = await Promise.all([
    db.select().from(preventiveMaintenanceRules).where(scope).orderBy(desc(preventiveMaintenanceRules.createdAt)),
    db.select().from(benchmarks).where(role === 'driver' ? eq(benchmarks.userId, userId) : undefined).orderBy(desc(benchmarks.createdAt)),
    db.select().from(incidents).where(role === 'driver' ? eq(incidents.userId, userId) : undefined).orderBy(desc(incidents.incidentDate)),
    db.select().from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))).orderBy(desc(notifications.createdAt)),
    db.select().from(alertRules).where(eq(alertRules.userId, userId)).orderBy(alertRules.category),
  ])
  return { preventive, benchmarks: benchmarkRows, incidents: incidentRows, notifications: notificationRows, alertRules: rules }
}

export async function createPreventiveRule(input: {
  truckId?: number
  name: string
  component: string
  intervalKm?: number
  intervalDays?: number
}) {
  const { userId, role } = await getContext()
  companyOnly(role)
  if (!input.intervalKm && !input.intervalDays) throw new Error('Informe intervalo por KM ou por dias')
  await db.insert(preventiveMaintenanceRules).values({
    userId,
    truckId: input.truckId || null,
    name: required(input.name, 'Nome'),
    component: required(input.component, 'Componente'),
    intervalKm: input.intervalKm && input.intervalKm > 0 ? String(input.intervalKm) : null,
    intervalDays: input.intervalDays && input.intervalDays > 0 ? input.intervalDays : null,
  })
  revalidatePath('/erp')
}

export async function createBenchmark(input: {
  truckId?: number
  metric: string
  source: 'technical' | 'operational'
  targetValue: number
  validFrom: string
}) {
  const { userId, role } = await getContext()
  companyOnly(role)
  if (!Number.isFinite(input.targetValue) || input.targetValue <= 0) throw new Error('A referência deve ser maior que zero')
  await db.insert(benchmarks).values({
    userId,
    truckId: input.truckId || null,
    metric: required(input.metric, 'Indicador'),
    source: input.source,
    targetValue: String(input.targetValue),
    validFrom: validDate(input.validFrom, 'Início da vigência'),
  })
  revalidatePath('/erp')
}

export async function createIncident(input: {
  truckId?: number
  driverId?: number
  category: string
  description: string
}) {
  const { userId } = await getContext()
  await db.insert(incidents).values({
    userId,
    truckId: input.truckId || null,
    driverId: input.driverId || null,
    incidentDate: new Date(),
    category: required(input.category, 'Categoria'),
    description: required(input.description, 'Descrição'),
  })
  revalidatePath('/erp')
}

export async function markNotificationRead(notificationId: number) {
  const { userId } = await getContext()
  if (!Number.isInteger(notificationId) || notificationId <= 0) throw new Error('Notificação inválida')
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
  revalidatePath('/erp')
}

export async function createAlertRule(input: {
  category: string
  metric: string
  warningPercent: number
  criticalPercent: number
}) {
  const { userId, role } = await getContext()
  companyOnly(role)
  if (input.warningPercent < 0 || input.criticalPercent <= input.warningPercent) throw new Error('Limites de alerta inválidos')
  await db.insert(alertRules).values({
    userId,
    category: required(input.category, 'Categoria'),
    metric: required(input.metric, 'Indicador'),
    warningPercent: String(input.warningPercent),
    criticalPercent: String(input.criticalPercent),
  })
  revalidatePath('/erp')
}
