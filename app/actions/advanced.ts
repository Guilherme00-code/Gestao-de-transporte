'use server'

import { and, desc, eq, isNull, or } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/current-user'
import { auth } from '@/lib/auth'
import {
  alertRules,
  benchmarks,
  incidents,
  notifications,
  preventiveMaintenanceRules,
  drivers,
  trucks,
  settings,
  revenueRules,
  expenseCategories,
  user,
  account,
  session,
} from '@/lib/db/schema'

async function getContext() {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('Não autorizado')
  return { userId: currentUser.id, email: currentUser.email, name: currentUser.name, role: currentUser.role }
}

function companyOnly(role: string) {
  if (role !== 'admin') throw new Error('Acesso restrito ao administrador')
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
  const [preventive, benchmarkRows, incidentRows, notificationRows, rules, managedUsers] = await Promise.all([
    db.select().from(preventiveMaintenanceRules).where(scope).orderBy(desc(preventiveMaintenanceRules.createdAt)),
    db.select().from(benchmarks).where(role === 'driver' ? eq(benchmarks.userId, userId) : undefined).orderBy(desc(benchmarks.createdAt)),
    db.select().from(incidents).where(role === 'driver' ? eq(incidents.userId, userId) : undefined).orderBy(desc(incidents.incidentDate)),
    db.select().from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))).orderBy(desc(notifications.createdAt)),
    db.select().from(alertRules).where(eq(alertRules.userId, userId)).orderBy(alertRules.category),
    role === 'admin' ? db.select({ id: user.id, name: user.name, email: user.email, role: user.role }).from(user).orderBy(user.name) : Promise.resolve([]),
  ])
  return { preventive, benchmarks: benchmarkRows, incidents: incidentRows, notifications: notificationRows, alertRules: rules, managedUsers }
}

export async function createPreventiveRule(input: {
  truckId?: number
  name: string
  component: string
  intervalKm?: number
  intervalDays?: number
}) {
  const { userId, email, name, role } = await getContext()
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
  const { userId, email, name, role } = await getContext()
  if (role === 'accountant') throw new Error('Contadores possuem acesso de consulta nesta área')
  if (role === 'driver') {
    const [assigned] = await db.select({ id: drivers.id }).from(drivers).innerJoin(trucks, eq(drivers.assignedTruckId, trucks.id)).where(and(eq(trucks.id, input.truckId || 0), or(eq(drivers.email, email), eq(drivers.name, name)))).limit(1)
    if (!assigned) throw new Error('Ocorrência limitada ao caminhão atribuído')
  }
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

export async function saveSetting(input: { key: string; value: string }) {
  const { userId, role } = await getContext()
  companyOnly(role)
  const key = required(input.key, 'Configuração')
  const value = required(input.value, 'Valor')
  const [existing] = await db.select({ id: settings.id }).from(settings).where(and(eq(settings.userId, userId), eq(settings.settingKey, key))).limit(1)
  if (existing) await db.update(settings).set({ settingValue: value, updatedAt: new Date() }).where(eq(settings.id, existing.id))
  else await db.insert(settings).values({ userId, settingKey: key, settingValue: value })
  revalidatePath('/erp')
}

export async function createRevenueRule(input: {
  name: string
  billingType: 'ton' | 'trip' | 'km' | 'route'
  origin?: string
  destination?: string
  rate: number
  validFrom: string
}) {
  const { userId, role } = await getContext()
  companyOnly(role)
  if (!Number.isFinite(input.rate) || input.rate <= 0) throw new Error('A tarifa deve ser maior que zero')
  await db.insert(revenueRules).values({
    userId,
    name: required(input.name, 'Nome da regra'),
    billingType: input.billingType,
    origin: input.origin?.trim() || null,
    destination: input.destination?.trim() || null,
    rate: String(input.rate),
    validFrom: validDate(input.validFrom, 'Início da vigência'),
  })
  revalidatePath('/erp')
}

export async function createExpenseCategory(input: { name: string; scope: 'company' | 'truck' | 'operation' }) {
  const { userId, role } = await getContext()
  companyOnly(role)
  await db.insert(expenseCategories).values({ userId, name: required(input.name, 'Categoria'), scope: input.scope })
  revalidatePath('/erp')
}

export async function updateManagedUserRole(input: { userId: string; role: 'admin' | 'accountant' | 'driver' }) {
  const { userId: currentUserId, role } = await getContext()
  companyOnly(role)
  const userId = required(input.userId, 'Usuário')
  if (userId === currentUserId && input.role !== 'admin') throw new Error('O administrador não pode remover o próprio acesso')
  await db.update(user).set({ role: input.role, updatedAt: new Date() }).where(eq(user.id, userId))
  revalidatePath('/erp')
}

export async function createEmployeeAccount(input: {
  name: string
  email: string
  password: string
  phone?: string
  employeeId?: string
  assignedTruckId?: number
}) {
  const { userId, role } = await getContext()
  companyOnly(role)
  const name = required(input.name, 'Nome')
  const email = required(input.email, 'E-mail').toLowerCase()
  if (input.password.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres')
  const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  if (existingUser) throw new Error('Já existe uma conta com este e-mail')
  if (input.assignedTruckId) {
    const [truck] = await db.select({ id: trucks.id }).from(trucks).where(and(eq(trucks.id, input.assignedTruckId), eq(trucks.userId, userId))).limit(1)
    if (!truck) throw new Error('O caminhão selecionado não pertence à empresa')
  }
  const result = await auth.api.signUpEmail({
    headers: await headers(),
    body: { name, email, password: input.password, role: 'driver' },
  })
  const employeeUserId = result.user.id
  try {
    await db.insert(drivers).values({
      userId,
      name,
      email,
      phone: input.phone?.trim() || null,
      employeeId: input.employeeId?.trim() || null,
      assignedTruckId: input.assignedTruckId || null,
    })
    await db.update(user).set({ role: 'driver' }).where(eq(user.id, employeeUserId))
  } catch (error) {
    await db.delete(session).where(eq(session.userId, employeeUserId))
    await db.delete(account).where(eq(account.userId, employeeUserId))
    await db.delete(user).where(eq(user.id, employeeUserId))
    throw error
  }
  revalidatePath('/erp')
}
