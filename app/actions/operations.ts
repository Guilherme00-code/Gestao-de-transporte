'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { dailyOperations, fuelRecords, trucks } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Não autorizado')
  return { userId: session.user.id, role: (session.user as { role?: string }).role ?? 'driver' }
}
async function assertTruckAccess(userId: string, role: string, truckId: number) {
  if (!Number.isInteger(truckId) || truckId <= 0) throw new Error('Selecione um caminhão válido')
  const [truck] = role === 'admin' || role === 'accountant'
    ? await db.select({ id: trucks.id }).from(trucks).where(eq(trucks.id, truckId)).limit(1)
    : await db.select({ id: trucks.id }).from(trucks).where(and(eq(trucks.id, truckId), eq(trucks.userId, userId))).limit(1)
  if (!truck) throw new Error('Caminhão não encontrado para esta conta')
}
function validNumber(value: number) { return Number.isFinite(value) }

export async function createDailyOperation(input: { truckId: number; driverName: string; operationDate: string; km: number; trips: number; tons: number; liters: number }) {
  const { userId, role } = await getContext()
  await assertTruckAccess(userId, role, input.truckId)
  if (!input.driverName.trim() || !input.operationDate || ![input.km, input.trips, input.tons, input.liters].every(validNumber) || input.km <= 0 || input.trips <= 0 || input.tons < 0 || input.liters <= 0) throw new Error('Informe valores válidos para a operação')
  await db.insert(dailyOperations).values({ userId, truckId: input.truckId, driverName: input.driverName.trim(), operationDate: new Date(`${input.operationDate}T00:00:00`), km: String(input.km), trips: String(input.trips), tons: String(input.tons), liters: String(input.liters), kmPerTrip: String(input.km / input.trips), tonsPerTrip: String(input.tons / input.trips), kmPerLiter: String(input.km / input.liters), litersPer100Km: String((input.liters / input.km) * 100) })
  revalidatePath('/')
}

export async function createFuelRecord(input: { truckId: number; driverName: string; recordDate: string; km: number; liters: number; pricePerLiter: number; station?: string }) {
  const { userId, role } = await getContext()
  await assertTruckAccess(userId, role, input.truckId)
  if (!input.driverName.trim() || !input.recordDate || ![input.km, input.liters, input.pricePerLiter].every(validNumber) || input.km <= 0 || input.liters <= 0 || input.pricePerLiter < 0) throw new Error('Informe valores válidos para o abastecimento')
  const totalCost = input.liters * input.pricePerLiter
  await db.insert(fuelRecords).values({ userId, truckId: input.truckId, driverName: input.driverName.trim(), recordDate: new Date(`${input.recordDate}T00:00:00`), km: String(input.km), liters: String(input.liters), pricePerLiter: String(input.pricePerLiter), totalCost: String(totalCost), costPerKm: String(totalCost / input.km), station: input.station?.trim() || null, fuelType: 'Diesel' })
  revalidatePath('/')
}
