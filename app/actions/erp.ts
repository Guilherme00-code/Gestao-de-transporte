'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/current-user'
import { createOperation } from '@/app/actions/operations'
import { db } from '@/lib/db'
import { auditLog, fuelRecord } from '@/lib/db/schema'

export async function getErpData() { await getCurrentUser(); return { tripRows: [], operationRows: [], maintenanceRows: [], downtimeRows: [], expenseRows: [], revenueRows: [], fuelRows: [], alertRows: [], closureRows: [], auditRows: [] } }
export async function importSpreadsheetData(input: { truckId?: number; driverId?: number; cana: Array<Record<string, unknown>>; fuel: Array<Record<string, unknown>> }) {
  const user = await getCurrentUser()
  if (!user || user.role === 'accountant') throw new Error('Acesso não autorizado.')
  let imported = 0
  let fuelImported = 0
  for (const row of input.cana) {
    if (!row.date || !row.city || Number(row.km) <= 0 || Number(row.tons) <= 0) continue
    await createOperation({ operationDate: String(row.date), truckCode: String(input.truckId ?? 'IMPORTADO'), truckId: input.truckId, driverName: 'Importação', city: String(row.city), km: Number(row.km), tons: Number(row.tons), liters: 0 })
    imported++
  }
  for (const row of input.fuel) {
    if (!row.date || Number(row.liters) <= 0 || Number(row.km) <= 0) continue
    await db.insert(fuelRecord).values({ ownerId: user.id, truckId: input.truckId || null, recordDate: String(row.date), km: String(row.km), liters: String(row.liters), pricePerLiter: '0', totalCost: '0', station: row.station ? String(row.station) : null })
    fuelImported++
  }
  await db.insert(auditLog).values({ userId: user.id, action: 'import', entity: 'spreadsheet', metadata: JSON.stringify({ trips: imported, fuelRecords: fuelImported }) })
  revalidatePath('/')
  return { trips: imported, fuelRecords: fuelImported }
}
export const createTrip = async (..._args: unknown[]) => { throw new Error('Use o formulário de operação para registrar viagens.') }
export const createMaintenance = createTrip
export const createDowntime = createTrip
export const createExpense = createTrip
export const createRevenue = createTrip
export const createAlert = createTrip
export const deleteTrip = createTrip
export const deleteMaintenance = createTrip
export const deleteDowntime = createTrip
export const deleteExpense = createTrip
export const deleteRevenue = createTrip
export const updateMaintenanceStatus = createTrip
export const startMonthlyReview = async (..._args: unknown[]) => { await getCurrentUser() }
export const closeMonthlyPeriod = startMonthlyReview
