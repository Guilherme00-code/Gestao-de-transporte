'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLog, transportOperation } from '@/lib/db/schema'
import { validateOperation } from '@/lib/transport-metrics'

type ImportedOperation = { operationDate: string; truckCode: string; driverName: string; city: string; km: number; tons: number; liters: number }

export async function importOperations(rows: ImportedOperation[]) {
  const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) throw new Error('Não autorizado.')
  const accepted: ImportedOperation[] = []; const rejected: Array<{ row: number; reason: string }> = []
  rows.forEach((row, index) => { try { if (!row.operationDate || !row.truckCode || !row.city) throw new Error('Data, caminhão e cidade são obrigatórios.'); validateOperation(row); accepted.push(row) } catch (error) { rejected.push({ row: index + 1, reason: error instanceof Error ? error.message : 'Linha inválida.' }) } })
  if (accepted.length) await db.insert(transportOperation).values(accepted.map((row) => ({ userId: session.user.id, operationDate: row.operationDate, truckCode: row.truckCode.trim(), driverName: row.driverName.trim(), city: row.city.trim(), km: String(row.km), tons: String(row.tons), liters: String(row.liters) })))
  await db.insert(auditLog).values({ userId: session.user.id, action: 'import', entity: 'transport_operation', metadata: JSON.stringify({ accepted: accepted.length, rejected: rejected.length }) })
  revalidatePath('/')
  return { accepted: accepted.length, rejected }
}
