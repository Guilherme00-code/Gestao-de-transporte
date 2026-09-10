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
  const raw = text(value).replace(/\s/g, '').replace(/KM/gi, '')
  const parts = raw.split('+').map(part => part.replace(',', '.'))
  const parsed = parts.reduce((sum, part) => sum + Number(part), 0)
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

function normalize(value: unknown) {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function readRows(sheet: XLSX.WorkSheet, required: string[]) {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
  const headerIndex = rows.findIndex(row => required.every(key => row.some(cell => normalize(cell).includes(normalize(key)))))
  if (headerIndex < 0) return []
  const headers = rows[headerIndex].map(cell => normalize(cell))
  return rows.slice(headerIndex + 1).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index]]))).filter(row => Object.values(row).some(value => text(value)))
}

function value(row: Row, keys: string[]) {
  const entry = Object.entries(row).find(([key]) => keys.some(candidate => key.includes(normalize(candidate))))
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
      const canaRows = readRows(workbook.Sheets.cana ?? workbook.Sheets[workbook.SheetNames[0]], ['data', 'peso', 'cidades'])
      const fuelName = workbook.SheetNames.find(name => normalize(name).includes('abastecimento'))
      const fuelSheet = fuelName ? workbook.Sheets[fuelName] : workbook.Sheets[workbook.SheetNames[1]]
      const fuelRows = fuelSheet ? readRows(fuelSheet, ['data', 'posto', 'litros']) : []
      const cana = canaRows.map(row => ({
        date: date(value(row, ['data'])),
        tons: number(value(row, ['peso'])) / 1000,
        city: text(value(row, ['cidades', 'cidade'])),
        km: number(value(row, ['distancia'])),
        departureTime: text(value(row, ['horas saida'])),
      })).filter(row => row.date && row.tons > 0 && row.city && row.km > 0)
      const fuel = fuelRows.map(row => ({
        date: date(value(row, ['data'])),
        odometer: number(value(row, ['km'])),
        km: number(value(row, ['km total'])),
        liters: number(value(row, ['litros'])),
        average: number(value(row, ['media'])),
        station: text(value(row, ['posto'])),
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
