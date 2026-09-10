'use server'

import { and, desc, eq, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  alerts,
  downtimeRecords,
  expenses,
  maintenanceRecords,
  monthlyClosures,
  revenues,
  trips,
  trucks,
} from '@/lib/db/schema'

type Role = 'admin' | 'accountant' | 'driver'

async function getContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Não autorizado')
  const role = ((session.user as { role?: string }).role ?? 'driver') as Role
  return { userId: session.user.id, role }
}

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} é obrigatório`)
  return normalized
}

function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} deve ser maior que zero`)
  return String(value)
}

function nonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} não pode ser negativo`)
  return String(value)
}

function dateValue(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00`).getTime())) {
    throw new Error(`${label} inválida`)
  }
  return new Date(`${value}T00:00:00`)
}

async function assertTruckAccess(userId: string, role: Role, truckId: number) {
  if (!Number.isInteger(truckId) || truckId <= 0) throw new Error('Caminhão inválido')
  const [truck] = await db
    .select({ id: trucks.id })
    .from(trucks)
    .where(role === 'admin' || role === 'accountant'
      ? eq(trucks.id, truckId)
      : and(eq(trucks.id, truckId), eq(trucks.userId, userId)))
    .limit(1)
  if (!truck) throw new Error('Caminhão não encontrado para esta conta')
}

function assertCompanyRole(role: Role) {
  if (role === 'driver') throw new Error('Acesso restrito ao administrador ou contador')
}

export async function getErpData() {
  const { userId, role } = await getContext()
  const companyScope = role === 'admin' || role === 'accountant' ? undefined : eq(trips.userId, userId)
  const [tripRows, maintenanceRows, downtimeRows, expenseRows, revenueRows, alertRows, closureRows] = await Promise.all([
    db.select().from(trips).where(companyScope).orderBy(desc(trips.tripDate)),
    db.select().from(maintenanceRecords).where(role === 'driver' ? eq(maintenanceRecords.userId, userId) : undefined).orderBy(desc(maintenanceRecords.maintenanceDate)),
    db.select().from(downtimeRecords).where(role === 'driver' ? eq(downtimeRecords.userId, userId) : undefined).orderBy(desc(downtimeRecords.startedAt)),
    db.select().from(expenses).where(role === 'driver' ? eq(expenses.userId, userId) : undefined).orderBy(desc(expenses.expenseDate)),
    db.select().from(revenues).where(role === 'driver' ? eq(revenues.userId, userId) : undefined).orderBy(desc(revenues.revenueDate)),
    db.select().from(alerts).where(role === 'driver' ? eq(alerts.userId, userId) : undefined).orderBy(desc(alerts.createdAt)),
    db.select().from(monthlyClosures).where(role === 'driver' ? eq(monthlyClosures.userId, userId) : undefined).orderBy(desc(monthlyClosures.referenceMonth)),
  ])
  return { tripRows, maintenanceRows, downtimeRows, expenseRows, revenueRows, alertRows, closureRows }
}

export async function createTrip(input: {
  truckId: number
  driverId?: number
  tripDate: string
  origin: string
  destination: string
  km: number
  tons: number
  startedAt?: string
  notes?: string
}) {
  const { userId, role } = await getContext()
  await assertTruckAccess(userId, role, input.truckId)
  await db.insert(trips).values({
    userId,
    truckId: input.truckId,
    driverId: input.driverId || null,
    tripDate: dateValue(input.tripDate, 'Data da viagem'),
    origin: requiredText(input.origin, 'Origem'),
    destination: requiredText(input.destination, 'Destino'),
    km: positive(input.km, 'KM'),
    tons: nonNegative(input.tons, 'Toneladas'),
    startedAt: input.startedAt ? new Date(input.startedAt) : null,
    notes: input.notes?.trim() || null,
  })
  revalidatePath('/')
}

export async function createMaintenance(input: {
  truckId: number
  maintenanceDate: string
  problem: string
  description?: string
  partsCost?: number
  laborCost?: number
  servicesCost?: number
  workshop?: string
}) {
  const { userId, role } = await getContext()
  assertCompanyRole(role)
  await assertTruckAccess(userId, role, input.truckId)
  const partsCost = Number(input.partsCost ?? 0)
  const laborCost = Number(input.laborCost ?? 0)
  const servicesCost = Number(input.servicesCost ?? 0)
  const totalCost = partsCost + laborCost + servicesCost
  await db.insert(maintenanceRecords).values({
    userId,
    truckId: input.truckId,
    maintenanceDate: dateValue(input.maintenanceDate, 'Data da manutenção'),
    problem: requiredText(input.problem, 'Problema'),
    description: input.description?.trim() || null,
    partsCost: nonNegative(partsCost, 'Custo de peças'),
    laborCost: nonNegative(laborCost, 'Custo de mão de obra'),
    servicesCost: nonNegative(servicesCost, 'Custo de serviços'),
    totalCost: String(totalCost),
    workshop: input.workshop?.trim() || null,
  })
  revalidatePath('/')
}

export async function createDowntime(input: {
  truckId: number
  reason: string
  startedAt: string
  endedAt?: string
  description?: string
}) {
  const { userId, role } = await getContext()
  assertCompanyRole(role)
  await assertTruckAccess(userId, role, input.truckId)
  const startedAt = new Date(input.startedAt)
  const endedAt = input.endedAt ? new Date(input.endedAt) : null
  if (Number.isNaN(startedAt.getTime()) || (endedAt && Number.isNaN(endedAt.getTime()))) throw new Error('Período de indisponibilidade inválido')
  if (endedAt && endedAt < startedAt) throw new Error('O fim não pode ser anterior ao início')
  await db.insert(downtimeRecords).values({
    userId,
    truckId: input.truckId,
    reason: requiredText(input.reason, 'Motivo'),
    startedAt,
    endedAt,
    description: input.description?.trim() || null,
    status: endedAt ? 'closed' : 'open',
  })
  revalidatePath('/')
}

export async function createExpense(input: { truckId?: number; category: string; amount: number; expenseDate: string; description?: string }) {
  const { userId, role } = await getContext()
  assertCompanyRole(role)
  if (input.truckId) await assertTruckAccess(userId, role, input.truckId)
  await db.insert(expenses).values({
    userId,
    truckId: input.truckId || null,
    category: requiredText(input.category, 'Categoria'),
    amount: positive(input.amount, 'Valor'),
    expenseDate: dateValue(input.expenseDate, 'Data da despesa'),
    description: input.description?.trim() || null,
  })
  revalidatePath('/')
}

export async function createRevenue(input: {
  truckId?: number
  tripId?: number
  origin?: string
  destination?: string
  tons?: number
  trips?: number
  km?: number
  amount: number
  revenueDate: string
}) {
  const { userId, role } = await getContext()
  assertCompanyRole(role)
  if (input.truckId) await assertTruckAccess(userId, role, input.truckId)
  await db.insert(revenues).values({
    userId,
    truckId: input.truckId || null,
    tripId: input.tripId || null,
    origin: input.origin?.trim() || null,
    destination: input.destination?.trim() || null,
    tons: nonNegative(input.tons ?? 0, 'Toneladas'),
    trips: nonNegative(input.trips ?? 0, 'Viagens'),
    km: nonNegative(input.km ?? 0, 'KM'),
    amount: positive(input.amount, 'Faturamento'),
    revenueDate: dateValue(input.revenueDate, 'Data do faturamento'),
  })
  revalidatePath('/')
}

export async function resolveAlert(alertId: number) {
  const { userId, role } = await getContext()
  assertCompanyRole(role)
  if (!Number.isInteger(alertId) || alertId <= 0) throw new Error('Alerta inválido')
  await db.update(alerts).set({ resolvedAt: new Date() }).where(and(eq(alerts.id, alertId), role === 'admin' ? undefined : eq(alerts.userId, userId)))
  revalidatePath('/')
}

export async function closeMonthlyPeriod(referenceMonth: string) {
  const { userId, role } = await getContext()
  assertCompanyRole(role)
  const month = dateValue(`${referenceMonth}-01`, 'Mês de referência')
  await db.insert(monthlyClosures).values({ userId, referenceMonth: month, status: 'closed', closedAt: new Date(), closedBy: userId })
  revalidatePath('/')
}
