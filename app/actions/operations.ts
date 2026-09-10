'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { dailyOperations, drivers, fuelRecords, trucks } from '@/lib/db/schema'
import { and, eq, or } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { calculateFuelCost, calculateOperationMetrics } from '@/lib/erp/calculations'

async function getContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Não autorizado')
  return { userId: session.user.id, email: session.user.email, name: session.user.name, role: (session.user as { role?: string }).role ?? 'driver' }
}
async function assertTruckAccess(userId: string, email: string, name: string, role: string, truckId: number) {
  if (!Number.isInteger(truckId) || truckId <= 0) throw new Error('Selecione um caminhão válido')
  const [truck] = role === 'admin' || role === 'accountant'
    ? await db.select({ id: trucks.id }).from(trucks).where(eq(trucks.id, truckId)).limit(1)
    : await db.select({ id: trucks.id }).from(trucks).innerJoin(drivers, eq(drivers.assignedTruckId, trucks.id)).where(and(eq(trucks.id, truckId), or(eq(drivers.email, email), eq(drivers.name, name)))).limit(1)
  if (!truck) throw new Error('Caminhão não encontrado para esta conta')
}
function validNumber(value: number | undefined): value is number { return value !== undefined && Number.isFinite(value) }

export async function createDailyOperation(input: { truckId: number; driverName: string; operationDate: string; km: number; trips: number; tons: number; liters: number; kmInitial?: number; kmFinal?: number; notes?: string }) {
  const { userId, email, name, role } = await getContext()
  await assertTruckAccess(userId, email, name, role, input.truckId)
  if (!input.driverName.trim() || !input.operationDate || ![input.km, input.trips, input.tons, input.liters].every(validNumber) || input.km < 0 || input.trips <= 0 || input.tons < 0 || input.liters < 0) throw new Error('Informe valores válidos para a operação')
  if ((input.kmInitial == null) !== (input.kmFinal == null) || (input.kmInitial != null && ![input.kmInitial, input.kmFinal].every(validNumber))) throw new Error('Informe KM inicial e KM final juntos')
  const metrics = calculateOperationMetrics(input)
  await db.insert(dailyOperations).values({ userId, truckId: input.truckId, driverName: input.driverName.trim(), operationDate: new Date(`${input.operationDate}T00:00:00`), kmInitial: input.kmInitial == null ? null : String(input.kmInitial), kmFinal: input.kmFinal == null ? null : String(input.kmFinal), km: String(metrics.km), trips: String(metrics.trips), tons: String(metrics.tons), liters: String(metrics.liters), kmPerTrip: String(metrics.kmPerTrip ?? 0), tonsPerTrip: String(metrics.tonsPerTrip ?? 0), kmPerLiter: String(metrics.kmPerLiter ?? 0), litersPer100Km: String(metrics.litersPer100Km ?? 0), notes: input.notes?.trim() || null })
  revalidatePath('/')
}

export async function createFuelRecord(input: { truckId: number; driverName: string; recordDate: string; km: number; liters: number; pricePerLiter: number; station?: string }) {
  const { userId, email, name, role } = await getContext()
  await assertTruckAccess(userId, email, name, role, input.truckId)
  if (!input.driverName.trim() || !input.recordDate || ![input.km, input.liters, input.pricePerLiter].every(validNumber) || input.km <= 0 || input.liters <= 0 || input.pricePerLiter < 0) throw new Error('Informe valores válidos para o abastecimento')
  const { totalCost } = calculateFuelCost(input.liters, input.pricePerLiter)
  await db.insert(fuelRecords).values({ userId, truckId: input.truckId, driverName: input.driverName.trim(), recordDate: new Date(`${input.recordDate}T00:00:00`), km: String(input.km), liters: String(input.liters), pricePerLiter: String(input.pricePerLiter), totalCost: String(totalCost), costPerKm: String(totalCost / input.km), station: input.station?.trim() || null, fuelType: 'Diesel' })
  revalidatePath('/')
}
