import { redirect } from 'next/navigation'
import TransportDashboard from '@/components/transport-dashboard'
import { listFuelRecords, listOperations } from '@/app/actions/operations'
import { getMaintenanceData } from '@/app/actions/erp'
import { getCurrentUser } from '@/lib/current-user'

type Trip = { id: number; date: string; tons: number; city: string; km: number; departure: string }
type FuelRecord = { date: string; liters: number; km: number; station: string; odometer: number }

export default async function Page() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')
  const [operations, fuelRows, maintenanceData] = await Promise.all([listOperations(), listFuelRecords(), getMaintenanceData()])
  const trips: Trip[] = operations.map((row) => ({
    id: row.id,
    date: row.operationDate,
    tons: Number(row.tons),
    city: row.city,
    km: Number(row.km),
    departure: row.driverName,
  }))
  const fuel: FuelRecord[] = fuelRows.map((row) => ({ date: row.recordDate, station: row.station ?? 'Não informado', odometer: Number(row.odometer ?? 0), km: Number(row.km), liters: Number(row.liters) }))
  return <TransportDashboard trips={trips} fuel={fuel} role={user.role} maintenanceData={maintenanceData} />
}
