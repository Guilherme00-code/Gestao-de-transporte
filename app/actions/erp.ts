'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/current-user'
import { db } from '@/lib/db'
import { auditLog, fuelRecord, maintenanceRecord, preventiveMaintenanceRules, transportOperation, trucks } from '@/lib/db/schema'

export async function getMaintenanceData() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Não autorizado.')
  const scope = user.role === 'driver' ? user.id : undefined
  const maintenance = await db.select().from(maintenanceRecord).where(scope ? eq(maintenanceRecord.ownerId, scope) : undefined)
  const plans = await db.select().from(preventiveMaintenanceRules).where(scope ? eq(preventiveMaintenanceRules.ownerId, scope) : undefined)
  const fleet = await db.select().from(trucks).where(scope ? eq(trucks.ownerId, scope) : undefined)
  return { maintenance, plans, fleet }
}

export async function getErpData() {
  await getCurrentUser()
  const maintenanceData = await getMaintenanceData()
  return { tripRows: [], operationRows: [], maintenanceRows: maintenanceData.maintenance.map(row => ({ ...row, totalCost: String(Number(row.partsCost) + Number(row.laborCost)) })), downtimeRows: [], expenseRows: [], revenueRows: [], fuelRows: [], alertRows: [], closureRows: [], auditRows: [] }
}

export async function createMaintenance(input: { truckId: number; maintenanceDate: string; maintenanceType: string; problem: string; description?: string; partsCost?: number; laborCost?: number; servicesCost?: number; workshop?: string; status?: string }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') throw new Error('Somente administradores podem cadastrar manutenção.')
  const costs = [input.partsCost, input.laborCost, input.servicesCost].map(value => Number(value ?? 0))
  if (!input.truckId || !input.maintenanceDate || !input.problem.trim()) throw new Error('Caminhão, data e problema são obrigatórios.')
  if (costs.some(value => !Number.isFinite(value) || value < 0)) throw new Error('Os custos não podem ser negativos.')
  await db.insert(maintenanceRecord).values({ ownerId: user.id, truckId: input.truckId, maintenanceDate: input.maintenanceDate, maintenanceType: input.maintenanceType || 'corretiva', problem: input.problem.trim(), description: [input.description, input.workshop ? `Oficina: ${input.workshop}` : '', `Serviços: ${costs[2].toFixed(2)}`].filter(Boolean).join('\n') || null, partsCost: String(costs[0]), laborCost: String(costs[1]), status: input.status || 'agendada' })
  await db.insert(auditLog).values({ userId: user.id, action: 'create', entity: 'maintenance_record', metadata: JSON.stringify({ ...input, totalCost: costs.reduce((sum, value) => sum + value, 0) }) })
  revalidatePath('/')
  revalidatePath('/erp')
}

export async function updateMaintenanceStatus(input: { id: number; status: string; reason: string }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') throw new Error('Somente administradores podem alterar manutenção.')
  const allowed = ['agendada', 'proxima', 'em_manutencao', 'aguardando_peca', 'aguardando_servico', 'finalizada', 'cancelada']
  if (!allowed.includes(input.status) || !input.reason.trim()) throw new Error('Status ou justificativa inválidos.')
  await db.update(maintenanceRecord).set({ status: input.status, resolvedAt: input.status === 'finalizada' ? new Date().toISOString().slice(0, 10) : null }).where(eq(maintenanceRecord.id, input.id))
  await db.insert(auditLog).values({ userId: user.id, action: 'update', entity: 'maintenance_record', entityId: String(input.id), reason: input.reason.trim() })
  revalidatePath('/')
  revalidatePath('/erp')
}
export async function importSpreadsheetData(input: { truckId?: number; driverId?: number; cana: Array<Record<string, unknown>>; fuel: Array<Record<string, unknown>> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') throw new Error('Somente administradores podem importar planilhas.')
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
      pricePerLiter: String(Number(row.pricePerLiter) || 0),
      totalCost: String((Number(row.pricePerLiter) || 0) * Number(row.liters)),
      station: row.station ? String(row.station).trim() : null,
    })))
    await tx.insert(auditLog).values({ userId: user.id, action: 'import', entity: 'spreadsheet', metadata: JSON.stringify({ trips: cana.length, fuelRecords: fuel.length, truckId: input.truckId ?? null, driverId: input.driverId ?? null }) })
  })
  revalidatePath('/')
  return { trips: cana.length, fuelRecords: fuel.length }
}
export const createTrip = async (..._args: unknown[]) => { throw new Error('Use o formulário de operação para registrar viagens.') }
export const createDowntime = createTrip
export const createExpense = createTrip
export const createRevenue = createTrip
export const createAlert = createTrip
export const deleteTrip = createTrip
export const deleteMaintenance = createTrip
export const deleteDowntime = createTrip
export const deleteExpense = createTrip
export const deleteRevenue = createTrip
export const startMonthlyReview = async (..._args: unknown[]) => { await getCurrentUser() }
export const closeMonthlyPeriod = startMonthlyReview
