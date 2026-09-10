'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { dailyOperations, drivers, trucks } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Não autorizado')
  const role = (session.user as { role?: string }).role ?? 'admin'
  return { userId: session.user.id, name: session.user.name, role }
}

export async function getManagementData() {
  const { userId, role } = await getContext()
  const canViewCompanyData = role === 'admin' || role === 'accountant'
  const fleetSelection = {
    id: trucks.id,
    code: trucks.code,
    plate: trucks.plate,
    model: trucks.model,
    brand: trucks.brand,
    status: trucks.status,
    currentDriver: trucks.currentDriver,
    currentKm: trucks.currentKm,
    benchmarkKmL: trucks.benchmarkKmL,
  }
  const teamSelection = {
    id: drivers.id,
    name: drivers.name,
    email: drivers.email,
    phone: drivers.phone,
    employeeId: drivers.employeeId,
    assignedTruckId: drivers.assignedTruckId,
    status: drivers.status,
  }
  const operationSelection = {
    id: dailyOperations.id,
    truckId: dailyOperations.truckId,
    driverName: dailyOperations.driverName,
    operationDate: dailyOperations.operationDate,
    km: dailyOperations.km,
    trips: dailyOperations.trips,
    tons: dailyOperations.tons,
    liters: dailyOperations.liters,
    kmPerTrip: dailyOperations.kmPerTrip,
    tonsPerTrip: dailyOperations.tonsPerTrip,
    kmPerLiter: dailyOperations.kmPerLiter,
    litersPer100Km: dailyOperations.litersPer100Km,
  }
  const [fleet, team] = await Promise.all([
    // The current deployment represents one transport company, so its authenticated
    // users share the fleet while records remain attributed to the submitting user.
    db.select(fleetSelection).from(trucks).orderBy(desc(trucks.createdAt)),
    canViewCompanyData ? db.select(teamSelection).from(drivers).orderBy(desc(drivers.createdAt)) : db.select(teamSelection).from(drivers).where(eq(drivers.userId, userId)).orderBy(desc(drivers.createdAt)),
  ])
  const operations = canViewCompanyData
    ? await db.select(operationSelection).from(dailyOperations).orderBy(desc(dailyOperations.operationDate))
    : await db.select(operationSelection).from(dailyOperations).where(eq(dailyOperations.userId, userId)).orderBy(desc(dailyOperations.operationDate))
  return { fleet, team, operations }
}

export async function createTruck(input: { code: string; plate: string; brand: string; model: string; currentKm?: number }) {
  const { userId, role } = await getContext()
  if (role !== 'admin') throw new Error('Somente administradores podem cadastrar caminhões')
  if (!input.code.trim() || !input.plate.trim() || !input.brand.trim() || !input.model.trim()) throw new Error('Preencha todos os campos obrigatórios')
  await db.insert(trucks).values({ userId, code: input.code.trim(), plate: input.plate.trim().toUpperCase(), brand: input.brand.trim(), model: input.model.trim(), currentKm: String(input.currentKm ?? 0) })
  revalidatePath('/')
}

export async function createDriver(input: { name: string; email?: string; phone?: string; employeeId?: string; assignedTruckId?: number }) {
  const { userId, role } = await getContext()
  if (role !== 'admin') throw new Error('Somente administradores podem cadastrar motoristas')
  if (!input.name.trim()) throw new Error('Informe o nome do motorista')
  await db.insert(drivers).values({ userId, name: input.name.trim(), email: input.email?.trim() || null, phone: input.phone?.trim() || null, employeeId: input.employeeId?.trim() || null, assignedTruckId: input.assignedTruckId || null })
  revalidatePath('/')
}
