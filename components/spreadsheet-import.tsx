'use client'

import { FormEvent, useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { importSpreadsheetData } from '@/app/actions/erp'

type Row = Record<string, unknown>
type Props = { fleet: Array<{ id: number; code: string; plate: string }>; team: Array<{ id: number; name: string }>; disabled?: boolean }

function text(value: unknown) {
  return String(value ?? '').trim()
}

function number(value: unknown) {
  const cleaned = text(value).replace(/\s/g, '').replace(/KM/gi, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function date(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }
  const parsed = new Date(text(value))
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

function find(row: Row, keys: string[]) {
  const entry = Object.entries(row).find(([key]) => keys.some(candidate => key.toLowerCase().includes(candidate)))
  return entry?.[1]
}

export default function SpreadsheetImport({ fleet, team, disabled }: Props) {
  const [truckId, setTruckId] = useState(String(fleet[0]?.id ?? ''))
  const [driverId, setDriverId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file || !truckId) return setMessage('Selecione um caminhão e a planilha.')
    setPending(true)
    setMessage('')
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const canaRows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets.cana ?? workbook.Sheets[workbook.SheetNames[0]], { defval: '' })
      const fuelSheet = workbook.Sheets.abastecimento ?? workbook.Sheets[workbook.SheetNames[1]]
      const fuelRows = fuelSheet ? XLSX.utils.sheet_to_json<Row>(fuelSheet, { defval: '' }) : []
      const cana = canaRows.map(row => ({
        date: date(find(row, ['data'])),
        tons: number(find(row, ['peso'])) / 1000,
        city: text(find(row, ['cidades', 'cidade'])),
        km: number(find(row, ['distância', 'distancia'])),
        departureTime: text(find(row, ['horas saída', 'horas saida'])),
      })).filter(row => row.date && row.tons > 0 && row.city && row.km > 0)
      const fuel = fuelRows.map(row => ({
        date: date(find(row, ['data'])),
        odometer: number(find(row, ['km'])),
        km: number(find(row, ['km total'])),
        liters: number(find(row, ['litros'])),
        average: number(find(row, ['média', 'media'])),
        station: text(find(row, ['posto'])),
      })).filter(row => row.date && row.liters > 0 && row.km > 0)
      const result = await importSpreadsheetData({ truckId: Number(truckId), driverId: Number(driverId) || undefined, cana, fuel })
      setMessage(`${result.trips} viagens de cana e ${result.fuelRecords} abastecimentos importados.`)
      setFile(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível importar a planilha.')
    } finally {
      setPending(false)
    }
  }

  return <section className="panel spreadsheet-import"><div className="panel-header"><div><div className="flex items-center gap-2"><FileSpreadsheet size={18} className="text-primary" /><h2 className="panel-title">Importar planilha operacional</h2></div><p className="panel-subtitle">Importe as abas “cana” e “abastecimento” para testar os dados reais no ERP.</p></div></div><form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submit}><select className="period-select" value={truckId} onChange={event => setTruckId(event.target.value)} disabled={disabled}><option value="">Caminhão destino</option>{fleet.map(item => <option key={item.id} value={item.id}>{item.code} · {item.plate}</option>)}</select><select className="period-select" value={driverId} onChange={event => setDriverId(event.target.value)} disabled={disabled}><option value="">Motorista opcional</option>{team.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label className="file-picker sm:col-span-2"><Upload size={16} /><span>{file?.name ?? 'Selecionar arquivo .xlsx'}</span><input type="file" accept=".xlsx,.xls" onChange={event => setFile(event.target.files?.[0] ?? null)} disabled={disabled} /></label><button className="primary-button sm:col-span-2 lg:col-span-4" disabled={pending || disabled}>{pending ? 'Importando...' : 'Importar dados da planilha'}</button></form>{message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}<p className="mt-3 text-xs text-muted-foreground">A planilha não possui preço do diesel; os abastecimentos entram com custo R$ 0,00 para não inventar valores.</p></section>
}
