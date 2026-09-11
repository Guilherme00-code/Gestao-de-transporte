'use client'

import { FormEvent, useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { importSpreadsheetData } from '@/app/actions/erp'

type Row = Record<string, unknown>
type Props = { fleet?: Array<{ id: number; code: string; plate: string }>; team?: Array<{ id: number; name: string }>; disabled?: boolean }

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
  const raw = text(value)
  const brazilianDate = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (brazilianDate) {
    const [, day, month, suppliedYear] = brazilianDate
    const year = suppliedYear ? Number(suppliedYear.length === 2 ? `20${suppliedYear}` : suppliedYear) : new Date().getFullYear()
    const result = new Date(Date.UTC(year, Number(month) - 1, Number(day)))
    return result.getUTCFullYear() === year && result.getUTCMonth() === Number(month) - 1 && result.getUTCDate() === Number(day) ? result.toISOString().slice(0, 10) : ''
  }
  const parsed = new Date(raw)
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

export default function SpreadsheetImport({ fleet = [], team = [], disabled }: Props) {
  const [truckId, setTruckId] = useState(String(fleet[0]?.id ?? ''))
  const [driverId, setDriverId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [preview, setPreview] = useState<{ cana: Row[]; fuel: Row[] } | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) return setMessage('Selecione uma planilha.')
    setPending(true)
    setMessage('')
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const canaName = workbook.SheetNames.find(name => normalize(name).includes('cana')) ?? workbook.SheetNames[0]
      const canaRows = readRows(workbook.Sheets[canaName], ['data', 'peso', 'cidades'])
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
        pricePerLiter: number(value(row, ['preço litro', 'preco litro', 'valor litro', 'preco'])),
        average: number(value(row, ['media'])),
        station: text(value(row, ['posto'])),
      })).filter(row => row.date && row.liters > 0 && Number.isFinite(row.km) && row.km >= 0)
      if (!cana.length && !fuel.length) throw new Error('Nenhum registro válido foi encontrado. Verifique se a planilha possui as colunas Data, Peso, Cidades, Distância, Posto e Litros.')
      setPreview({ cana, fuel })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível importar a planilha.')
    } finally {
      setPending(false)
    }
  }

  async function confirmImport() {
    if (!preview) return
    setPending(true)
    try {
      const result = await importSpreadsheetData({ truckId: Number(truckId) || undefined, driverId: Number(driverId) || undefined, cana: preview.cana, fuel: preview.fuel })
      setMessage(`${result.trips} viagens de cana e ${result.fuelRecords} abastecimentos importados. Os indicadores foram recalculados.`)
      setPreview(null)
      setFile(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível importar a planilha.')
    } finally {
      setPending(false)
    }
  }

  return <section className="panel spreadsheet-import"><div className="panel-header"><div><div className="flex items-center gap-2"><FileSpreadsheet size={18} className="text-primary" /><h2 className="panel-title">Importar planilha operacional</h2></div><p className="panel-subtitle">As colunas são identificadas automaticamente e a prévia é revisada antes da gravação.</p></div></div><form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submit}><select className="period-select" value={truckId} onChange={event => setTruckId(event.target.value)} disabled={disabled}><option value="">Caminhão destino (opcional)</option>{fleet.map(item => <option key={item.id} value={item.id}>{item.code} · {item.plate}</option>)}</select><select className="period-select" value={driverId} onChange={event => setDriverId(event.target.value)} disabled={disabled}><option value="">Motorista opcional</option>{team.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label className="file-picker sm:col-span-2"><Upload size={16} /><span>{file?.name ?? 'Selecionar arquivo .xlsx'}</span><input type="file" accept=".xlsx,.xls" onChange={event => setFile(event.target.files?.[0] ?? null)} disabled={disabled} /></label><button className="primary-button sm:col-span-2 lg:col-span-4" disabled={pending || disabled}>{pending ? 'Lendo planilha...' : 'Preparar importação'}</button></form>{message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}<p className="mt-3 text-xs text-muted-foreground">Nenhum dado é salvo antes da sua confirmação.</p>{preview && <div className="modal-backdrop" role="presentation"><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="import-confirm-title"><h3 id="import-confirm-title">Confirmar importação</h3><p>Encontramos <strong>{preview.cana.length}</strong> viagens e <strong>{preview.fuel.length}</strong> abastecimentos válidos.</p><p className="muted">Ao confirmar, a importação será gravada de uma só vez, auditada e os indicadores serão recalculados.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setPreview(null)} disabled={pending}>Revisar depois</button><button type="button" className="primary-action" onClick={confirmImport} disabled={pending}>{pending ? 'Salvando...' : 'Confirmar e salvar'}</button></div></div></div>}</section>
}
