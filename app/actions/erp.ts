'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/current-user'
import { db } from '@/lib/db'
import { auditLog, fuelRecord, transportOperation } from '@/lib/db/schema'

export async function getErpData() { await getCurrentUser(); return { tripRows: [], operationRows: [], maintenanceRows: [], downtimeRows: [], expenseRows: [], revenueRows: [], fuelRows: [], alertRows: [], closureRows: [], auditRows: [] } }
export async function importSpreadsheetData(input: { truckId?: number; driverId?: number; cana: Array<Record<string, unknown>>; fuel: Array<Record<string, unknown>> }) {
  const user = await getCurrentUser()
  if (!user || user.role === 'accountant') throw new Error('Acesso não autorizado.')
  const cana = input.cana.filter((row) => row.date && row.city && Number(row.km) > 0 && Number(row.tons) > 0)
  const fuel = input.fuel.filter((row) => row.date && Number(row.liters) > 0 && Number.isFinite(Number(row.km)) && Number(row.km) >= 0)
  if (!cana.length && !fuel.length) throw new Error('A planilha não possui registros válidos para importar.')

  // A transação impede que uma falha deixe a planilha apenas parcialmente salva.
  await db.transaction(async (tx) => {
    if (cana.length) await tx.insert(transportOperation).values(cana.map((row) => ({
      userId: user.id,
      truckId: input.truckId || null,
      driverId: input.driverId || null,
      operationDate: String(row.date),
      truckCode: String(input.truckId ?? 'IMPORTADO'),
      driverName: 'Importação de planilha',
      city: String(row.city).trim(),
      km: String(Number(row.km)),
      tons: String(Number(row.tons)),
      liters: '0',
      trips: '1',
      notes: row.departureTime ? `Saída informada na planilha: ${String(row.departureTime)}` : null,
    })))
    if (fuel.length) await tx.insert(fuelRecord).values(fuel.map((row) => ({
      ownerId: user.id,
      truckId: input.truckId || null,
      driverId: input.driverId || null,
      recordDate: String(row.date),
      odometer: Number(row.odometer) > 0 ? String(Number(row.odometer)) : null,
      km: String(Number(row.km)),
      liters: String(Number(row.liters)),
      pricePerLiter: '0',
      totalCost: '0',
      station: row.station ? String(row.station).trim() : null,
    })))
    await tx.insert(auditLog).values({ userId: user.id, action: 'import', entity: 'spreadsheet', metadata: JSON.stringify({ trips: cana.length, fuelRecords: fuel.length, truckId: input.truckId ?? null, driverId: input.driverId ?? null }) })
  })
  revalidatePath('/')
  return { trips: cana.length, fuelRecords: fuel.length }
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
