'use server'

import { revalidatePath } from 'next/cache'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditLog, fuelRecord, transportOperation } from '@/lib/db/schema'
import { validateOperation } from '@/lib/transport-metrics'
import { getCurrentUser } from '@/lib/current-user'

async function getContext() {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error('Não autorizado.')
  return currentUser
}

export async function listOperations() {
  const currentUser = await getContext()
  const query = db.select().from(transportOperation)
  return (currentUser.role === 'driver'
    ? query.where(eq(transportOperation.userId, currentUser.id))
    : query).orderBy(desc(transportOperation.operationDate))
}

export async function listFuelRecords() {
  const currentUser = await getContext()
  const query = db.select().from(fuelRecord)
  return (currentUser.role === 'driver' ? query.where(eq(fuelRecord.ownerId, currentUser.id)) : query).orderBy(desc(fuelRecord.recordDate))
}

export async function createOperation(input: { operationDate: string; truckCode: string; driverName: string; city: string; km: number; tons: number; liters: number; truckId?: number; driverId?: number; trips?: number; notes?: string }) {
  const currentUser = await getContext()
  if (currentUser.role === 'accountant') throw new Error('Contadores possuem acesso somente para consulta.')
  validateOperation(input)
  const [created] = await db.insert(transportOperation).values({
    userId: currentUser.id, truckId: input.truckId || null, driverId: input.driverId || null, operationDate: input.operationDate, truckCode: input.truckCode.trim(),
    driverName: input.driverName.trim(), city: input.city.trim(), km: String(input.km),
    tons: String(input.tons), liters: String(input.liters), trips: String(input.trips ?? 1), notes: input.notes?.trim() || null,
  }).returning()
  await db.insert(auditLog).values({ userId: currentUser.id, action: 'create', entity: 'transport_operation', entityId: String(created.id), metadata: JSON.stringify(input) })
  revalidatePath('/')
  return created
}

export async function createDailyOperation(input: { truckId: number; driverName: string; operationDate: string; km: number; trips: number; tons: number; liters: number; kmInitial?: number; kmFinal?: number; notes?: string }) {
  await createOperation({ operationDate: input.operationDate, truckCode: String(input.truckId), truckId: input.truckId, driverName: input.driverName, city: 'Usina', km: input.km, tons: input.tons, liters: input.liters, trips: input.trips, notes: input.notes })
}

export async function createFuelRecord(input: { truckId?: number; driverName?: string; recordDate?: string; km: number; liters: number; pricePerLiter?: number; station?: string }) {
  const currentUser = await getContext()
  if (input.km < 0 || input.liters <= 0) throw new Error('KM e litros devem ser válidos.')
  await db.insert(fuelRecord).values({ ownerId: currentUser.id, truckId: input.truckId || null, recordDate: input.recordDate ?? new Date().toISOString().slice(0, 10), km: String(input.km), liters: String(input.liters), pricePerLiter: String(input.pricePerLiter ?? 0), totalCost: String((input.pricePerLiter ?? 0) * input.liters), station: input.station?.trim() || null })
  await db.insert(auditLog).values({ userId: currentUser.id, action: 'create', entity: 'fuel_record', metadata: JSON.stringify(input) })
  revalidatePath('/')
}
