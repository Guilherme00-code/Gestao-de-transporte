'use server'

import { and, desc, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { alertRules, benchmarks, drivers, expenseCategories, incidents, notifications, preventiveMaintenanceRules, revenueRules, settings, trucks, user } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { auth } from '@/lib/auth'

async function context() {
  const current = await getCurrentUser()
  if (!current) throw new Error('Não autorizado.')
  return current
}
async function admin() {
  const current = await context()
  if (current.role !== 'admin') throw new Error('Somente administradores podem alterar estas configurações.')
  return current
}
function text(value: string, label: string) {
  const result = value.trim()
  if (!result) throw new Error(`${label} é obrigatório.`)
  return result
}

export async function getAdvancedData() {
  const current = await context()
  const [preventive, benchmarkRows, incidentRows, notificationRows, alertRows, managedUsers] = await Promise.all([
    db.select().from(preventiveMaintenanceRules).where(eq(preventiveMaintenanceRules.ownerId, current.id)).orderBy(desc(preventiveMaintenanceRules.createdAt)),
    db.select().from(benchmarks).where(eq(benchmarks.ownerId, current.id)).orderBy(desc(benchmarks.createdAt)),
    db.select().from(incidents).where(current.role === 'driver' ? eq(incidents.ownerId, current.id) : undefined).orderBy(desc(incidents.incidentDate)),
    db.select().from(notifications).where(and(eq(notifications.userId, current.id), isNull(notifications.readAt))).orderBy(desc(notifications.createdAt)),
    db.select().from(alertRules).where(eq(alertRules.ownerId, current.id)).orderBy(alertRules.category),
    current.role === 'admin' ? db.select({ id: user.id, name: user.name, email: user.email, role: user.role }).from(user).orderBy(user.name) : Promise.resolve([]),
  ])
  return { preventive, benchmarks: benchmarkRows, incidents: incidentRows, notifications: notificationRows, alertRules: alertRows, managedUsers }
}

export async function createIncident(input: { truckId?: number; driverId?: number; category: string; description: string }) {
  const current = await context()
  await db.insert(incidents).values({ ownerId: current.id, truckId: input.truckId || null, driverId: input.driverId || null, incidentDate: new Date().toISOString().slice(0, 10), category: text(input.category, 'Categoria'), description: text(input.description, 'Descrição') })
  revalidatePath('/')
}
export async function createPreventiveRule(input: { truckId?: number; name: string; component: string; intervalKm?: number; intervalDays?: number }) {
  const current = await admin()
  if (!input.intervalKm && !input.intervalDays) throw new Error('Informe intervalo por KM ou dias.')
  await db.insert(preventiveMaintenanceRules).values({ ownerId: current.id, truckId: input.truckId || null, name: text(input.name, 'Nome'), component: text(input.component, 'Componente'), intervalKm: input.intervalKm ? String(input.intervalKm) : null, intervalDays: input.intervalDays || null })
  revalidatePath('/')
}
export async function createBenchmark(input: { truckId?: number; metric: string; source?: string; targetValue: number; validFrom: string }) {
  const current = await admin()
  await db.insert(benchmarks).values({ ownerId: current.id, truckId: input.truckId || null, metric: text(input.metric, 'Indicador'), targetValue: String(input.targetValue), validFrom: input.validFrom })
  revalidatePath('/')
}
export async function createAlertRule(input: { category: string; metric: string; warningPercent: number; criticalPercent: number }) {
  const current = await admin()
  if (input.criticalPercent <= input.warningPercent) throw new Error('Limites de alerta inválidos.')
  await db.insert(alertRules).values({ ownerId: current.id, category: text(input.category, 'Categoria'), metric: text(input.metric, 'Indicador'), warningPercent: String(input.warningPercent), criticalPercent: String(input.criticalPercent) })
  revalidatePath('/')
}
export async function saveSetting(input: { key: string; value: string }) {
  const current = await admin()
  await db.insert(settings).values({ ownerId: current.id, settingKey: text(input.key, 'Configuração'), settingValue: text(input.value, 'Valor') })
  revalidatePath('/')
}
export async function createRevenueRule(input: { name: string; billingType: string; origin?: string; destination?: string; rate: number; validFrom: string }) {
  const current = await admin()
  await db.insert(revenueRules).values({ ownerId: current.id, name: text(input.name, 'Nome'), billingType: input.billingType, origin: input.origin?.trim() || null, destination: input.destination?.trim() || null, rate: String(input.rate), validFrom: input.validFrom })
  revalidatePath('/')
}
export async function createExpenseCategory(input: { name: string; scope: string }) {
  const current = await admin()
  await db.insert(expenseCategories).values({ ownerId: current.id, name: text(input.name, 'Categoria'), scope: input.scope })
  revalidatePath('/')
}
export async function updateManagedUserRole(input: { userId: string; role: 'admin' | 'accountant' | 'driver' }) {
  const current = await admin()
  if (input.userId === current.id && input.role !== 'admin') throw new Error('Você não pode remover o próprio acesso.')
  await db.update(user).set({ role: input.role, updatedAt: new Date() }).where(eq(user.id, input.userId))
  revalidatePath('/')
}
export async function markNotificationRead(notificationId: number) {
  const current = await context()
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, current.id)))
  revalidatePath('/')
}
export async function listUnreadNotifications() {
  const current = await context()
  return db.select().from(notifications).where(and(eq(notifications.userId, current.id), isNull(notifications.readAt))).orderBy(desc(notifications.createdAt))
}
export async function createEmployeeAccount(input: { name: string; email: string; password: string; role: 'driver' | 'accountant'; phone?: string; employeeId?: string; truckId?: number }) {
  const current = await admin()
  if (input.password.length < 8) throw new Error('A senha inicial deve ter pelo menos 8 caracteres.')
  if (input.role !== 'driver' && input.role !== 'accountant') throw new Error('Selecione um perfil válido para o funcionário.')
  const result = await auth.api.signUpEmail({ body: { name: text(input.name, 'Nome'), email: text(input.email, 'E-mail').toLowerCase(), password: input.password } })
  if (!result.user) throw new Error('Não foi possível criar a conta do funcionário.')
  await db.update(user).set({ role: input.role, updatedAt: new Date() }).where(eq(user.id, result.user.id))
  if (input.role === 'driver') await db.insert(drivers).values({ ownerId: current.id, userId: result.user.id, name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone?.trim() || null, employeeId: input.employeeId?.trim() || null, assignedTruckId: input.truckId || null })
  await db.insert(notifications).values({ userId: result.user.id, title: 'Acesso criado', message: 'Seu acesso foi criado pelo administrador. Entre com a senha inicial e altere-a em Minha conta.' })
  revalidatePath('/')
}
