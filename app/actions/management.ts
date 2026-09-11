'use server'

import { and, desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { drivers, trucks, transportOperation, auditLog } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/current-user'

async function context() {
  const current = await getCurrentUser()
  if (!current) throw new Error('Não autorizado.')
  return current
}
async function admin() {
  const current = await context()
  if (current.role !== 'admin') throw new Error('Somente administradores podem alterar cadastros.')
  return current
}

export async function getManagementData() {
  const current = await context()
  const company = current.role !== 'driver'
  const fleet = await db.select().from(trucks).where(company ? undefined : eq(trucks.ownerId, current.id)).orderBy(desc(trucks.createdAt))
  const team = await db.select().from(drivers).where(company ? undefined : eq(drivers.ownerId, current.id)).orderBy(desc(drivers.createdAt))
  const operations = await db.select().from(transportOperation).where(company ? undefined : eq(transportOperation.userId, current.id)).orderBy(desc(transportOperation.operationDate))
  return {
    fleet: fleet.map((item) => ({ ...item, userId: item.ownerId, currentDriver: null, benchmarkKmL: item.benchmarkKmL ?? '0' })),
    team,
    operations: operations.map((item) => ({ ...item, truckId: item.truckId ?? 0, trips: item.trips, kmPerTrip: '0', tonsPerTrip: '0', kmPerLiter: Number(item.liters) ? String(Number(item.km) / Number(item.liters)) : '0', litersPer100Km: Number(item.km) ? String(Number(item.liters) * 100 / Number(item.km)) : '0' })),
  }
}

export async function createTruck(input: { code: string; plate: string; brand: string; model: string; currentKm?: number; year?: number; capacityTons?: number; fuelType?: string; benchmarkKmL?: number }) {
  const current = await admin()
  if (!input.code.trim() || !input.plate.trim() || !input.brand.trim() || !input.model.trim()) throw new Error('Preencha os campos obrigatórios.')
  const [created] = await db.insert(trucks).values({ ownerId: current.id, code: input.code.trim(), plate: input.plate.trim().toUpperCase(), brand: input.brand.trim(), model: input.model.trim(), currentKm: String(input.currentKm ?? 0), year: input.year || null, capacityTons: input.capacityTons ? String(input.capacityTons) : null, fuelType: input.fuelType?.trim() || 'Diesel', benchmarkKmL: input.benchmarkKmL ? String(input.benchmarkKmL) : null }).returning()
  await db.insert(auditLog).values({ userId: current.id, action: 'create', entity: 'truck', entityId: String(created.id), metadata: JSON.stringify(input) })
  revalidatePath('/')
}

export async function createDriver(input: { name: string; email?: string; phone?: string; employeeId?: string; assignedTruckId?: number }) {
  const current = await admin()
  if (!input.name.trim()) throw new Error('Informe o nome do motorista.')
  const [created] = await db.insert(drivers).values({ ownerId: current.id, name: input.name.trim(), email: input.email?.trim() || null, phone: input.phone?.trim() || null, employeeId: input.employeeId?.trim() || null, assignedTruckId: input.assignedTruckId || null }).returning()
  await db.insert(auditLog).values({ userId: current.id, action: 'create', entity: 'driver', entityId: String(created.id), metadata: JSON.stringify(input) })
  revalidatePath('/')
}

export async function updateTruckStatus(truckId: number, status: string) {
  const current = await admin()
  await db.update(trucks).set({ status: status.trim() || 'active' }).where(and(eq(trucks.id, truckId), eq(trucks.ownerId, current.id)))
  revalidatePath('/')
}
