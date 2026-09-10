'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculateFinancialMetrics } from '@/lib/erp/calculations'
import {
  closeMonthlyPeriod,
  startMonthlyReview,
  createAlert,
  createDowntime,
  createExpense,
  createMaintenance,
  createRevenue,
  createTrip,
  deleteDowntime,
  deleteExpense,
  deleteMaintenance,
  deleteRevenue,
  updateMaintenanceStatus,
  deleteTrip,
} from '@/app/actions/erp'

type FleetItem = { id: number; code: string; plate: string; brand: string; model: string }
type DriverItem = { id: number; name: string }
type ErpData = {
  tripRows: Array<{ id: number; truckId: number; driverId: number | null; tripDate: string | Date; origin: string; destination: string; km: string; tons: string }>
  maintenanceRows: Array<{ id: number; truckId: number; maintenanceDate: string | Date; problem: string; totalCost: string; status: string }>
  downtimeRows: Array<{ id: number; truckId: number; startedAt: string | Date; reason: string; status: string }>
  expenseRows: Array<{ id: number; truckId: number | null; expenseDate: string | Date; category: string; amount: string }>
  revenueRows: Array<{ id: number; truckId: number | null; revenueDate: string | Date; amount: string; origin: string | null; destination: string | null }>
  fuelRows: Array<{ id: number; truckId: number; recordDate: string | Date; liters: string; totalCost: string; station: string | null; driverName: string }>
  alertRows: Array<{ id: number; severity: string; title: string; message: string }>
  closureRows: Array<{ id: number; referenceMonth: string | Date; status: string }>
  auditRows: Array<{ id: number; entity: string; entityId: string; action: string; reason: string | null; createdAt: string | Date }>
}

type Props = { fleet: FleetItem[]; team: DriverItem[]; data: ErpData; role: 'admin' | 'accountant' }
type FormState = Record<string, string>

const initial: FormState = {
  truckId: '', driverId: '', date: '', origin: '', destination: '', km: '', tons: '',
  problem: '', maintenanceType: 'corrective', description: '', partsCost: '', laborCost: '', servicesCost: '', workshop: '',
  reason: '', startedAt: '', endedAt: '', category: '', amount: '', revenueDate: '',
  month: '', alertTitle: '', alertMessage: '', alertSeverity: 'warning',
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value))
}

function ComparisonMetric({ label, value, help }: { label: string; value: string; help: string }) {
  return <div className="metric-card"><p className="eyebrow">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-3 text-xs text-muted-foreground">{help}</p></div>
}

function sumNumbers<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce<number>((sum, item) => sum + getValue(item), 0)
}

export default function ErpModules({ fleet, team, data, role }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({ ...initial, truckId: String(fleet[0]?.id ?? ''), driverId: String(team[0]?.id ?? '') })
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [period, setPeriod] = useState('')
  const [historyWindow, setHistoryWindow] = useState('all')
  const [reportTruckId, setReportTruckId] = useState('')
  const [reportDriverId, setReportDriverId] = useState('')
  const [showComparison, setShowComparison] = useState(false)
  const set = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }))
  const run = async (event: FormEvent, action: () => Promise<void>) => {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try {
      await action()
      setMessage('Registro salvo com sucesso.')
      setForm(current => ({ ...initial, truckId: current.truckId, driverId: current.driverId }))
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar')
    } finally {
      setPending(false)
    }
  }
  const truckId = Number(form.truckId)
  const driverId = Number(form.driverId)
  const filtered = useMemo(() => {
    const selectedMonth = period ? new Date(`${period}-01T00:00:00`) : null
    const windowStart = historyWindow !== 'all'
      ? (() => {
          const date = selectedMonth ? new Date(selectedMonth) : new Date()
          date.setMonth(date.getMonth() - Number(historyWindow) + 1)
          date.setDate(1)
          return date
        })()
      : null
    const matches = (value: string | Date) => {
      const date = new Date(value)
      if (selectedMonth && historyWindow === 'all') return formatDate(value).slice(3).split('/').reverse().join('-') === period
      if (windowStart) return date >= windowStart && (!selectedMonth || date <= new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59))
      return true
    }
    const truckMatches = (truckId: number) => !reportTruckId || String(truckId) === reportTruckId
    const driverMatches = (driverId: number | null) => !reportDriverId || String(driverId ?? '') === reportDriverId
    return {
      ...data,
      tripRows: data.tripRows.filter(item => matches(item.tripDate) && truckMatches(item.truckId) && driverMatches(item.driverId)),
      maintenanceRows: data.maintenanceRows.filter(item => matches(item.maintenanceDate) && truckMatches(item.truckId)),
      downtimeRows: data.downtimeRows.filter(item => matches(item.startedAt) && truckMatches(item.truckId)),
      expenseRows: data.expenseRows.filter(item => matches(item.expenseDate) && (!reportTruckId || String(item.truckId ?? '') === reportTruckId)),
      revenueRows: data.revenueRows.filter(item => matches(item.revenueDate) && (!reportTruckId || String(item.truckId ?? '') === reportTruckId)),
      fuelRows: data.fuelRows.filter(item => matches(item.recordDate) && truckMatches(item.truckId) && (!reportDriverId || item.driverName === team.find(driver => String(driver.id) === reportDriverId)?.name)),
    }
  }, [data, period, historyWindow, reportTruckId, reportDriverId, team])
  const totals = {
    revenue: sumNumbers(filtered.revenueRows, item => Number(item.amount)),
    expenses: sumNumbers(filtered.expenseRows, item => Number(item.amount)),
    trips: filtered.tripRows.length,
    maintenance: sumNumbers(filtered.maintenanceRows, item => Number(item.totalCost)),
    fuel: sumNumbers(filtered.fuelRows, item => Number(item.totalCost)),
    openDowntime: filtered.downtimeRows.filter(item => item.status === 'open').length,
  }
  const truckRanking = filtered.tripRows.reduce<Record<string, { trips: number; tons: number; km: number }>>((ranking, item) => {
    const current = ranking[String(item.truckId)] ?? { trips: 0, tons: 0, km: 0 }
    current.trips += 1
    current.tons += Number(item.tons)
    current.km += Number(item.km)
    ranking[String(item.truckId)] = current
    return ranking
  }, {})
  const rankingRows = Object.entries(truckRanking).sort(([, left], [, right]) => right.tons - left.tons).slice(0, 10)
  const driverRanking = filtered.tripRows.reduce<Record<string, { trips: number; tons: number; km: number }>>((ranking, item) => {
    const driver = team.find(candidate => candidate.id === item.driverId)
    const key = driver?.name ?? 'Motorista não informado'
    const current = ranking[key] ?? { trips: 0, tons: 0, km: 0 }
    current.trips += 1
    current.tons += Number(item.tons)
    current.km += Number(item.km)
    ranking[key] = current
    return ranking
  }, {})
  const driverRankingRows = Object.entries(driverRanking).sort(([, left], [, right]) => right.tons - left.tons).slice(0, 10)
  const financial = calculateFinancialMetrics({ revenue: totals.revenue, costs: totals.expenses + totals.maintenance })
  const previousPeriod = period ? (() => { const date = new Date(`${period}-01T00:00:00`); date.setMonth(date.getMonth() - 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` })() : ''
  const previousMatches = (value: string | Date) => previousPeriod && formatDate(value).slice(3).split('/').reverse().join('-') === previousPeriod
  const previousTrips = previousPeriod ? data.tripRows.filter(item => previousMatches(item.tripDate)).length : 0
  const previousTons = previousPeriod ? sumNumbers(data.tripRows.filter(item => previousMatches(item.tripDate)), item => Number(item.tons)) : 0
  const variation = previousPeriod && previousTrips > 0 ? ((totals.trips - previousTrips) / previousTrips) * 100 : null
  const exportCsv = () => {
    const rows = [
      ['tipo', 'data', 'descricao', 'valor'],
      ...filtered.tripRows.map(item => ['viagem', formatDate(item.tripDate), `${item.origin} -> ${item.destination}`, item.km]),
      ...filtered.fuelRows.map(item => ['combustivel', formatDate(item.recordDate), item.station || 'Nao informado', item.totalCost]),
      ...filtered.downtimeRows.map(item => ['parada', formatDate(item.startedAt), item.reason, item.status]),
      ...filtered.expenseRows.map(item => ['despesa', formatDate(item.expenseDate), item.category, item.amount]),
      ...filtered.revenueRows.map(item => ['faturamento', formatDate(item.revenueDate), `${item.origin || ''} -> ${item.destination || ''}`, item.amount]),
      ...filtered.maintenanceRows.map(item => ['manutencao', formatDate(item.maintenanceDate), item.problem, item.totalCost]),
    ]
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = `relatorio-financeiro${period ? `-${period}` : ''}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const exportExcel = () => {
    const headers = ['tipo', 'data', 'descricao', 'valor']
    const rows = [
      ...filtered.tripRows.map(item => ['viagem', formatDate(item.tripDate), `${item.origin} -> ${item.destination}`, item.km]),
      ...filtered.fuelRows.map(item => ['combustivel', formatDate(item.recordDate), item.station || 'Nao informado', item.totalCost]),
      ...filtered.expenseRows.map(item => ['despesa', formatDate(item.expenseDate), item.category, item.amount]),
      ...filtered.revenueRows.map(item => ['faturamento', formatDate(item.revenueDate), `${item.origin || ''} -> ${item.destination || ''}`, item.amount]),
      ...filtered.maintenanceRows.map(item => ['manutencao', formatDate(item.maintenanceDate), item.problem, item.totalCost]),
    ]
    const table = `<table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`<html><meta charset="utf-8">${table}</html>`], { type: 'application/vnd.ms-excel' }))
    link.download = `relatorio${period ? `-${period}` : ''}.xls`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const remove = async (action: () => Promise<void>) => {
    if (!window.confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return
    setPending(true)
    setMessage('')
    try {
      await action()
      setMessage('Registro excluído. Atualize a página para consultar os dados.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível excluir')
    } finally {
      setPending(false)
    }
  }
    const changeMaintenanceStatus = async (id: number) => {
      const status = window.prompt('Status: open, in_progress, awaiting_part ou completed', 'in_progress')
      if (!status || !['open', 'in_progress', 'awaiting_part', 'completed'].includes(status)) {
        setMessage('Status de manutenção inválido')
        return
      }
      const reason = window.prompt('Motivo da alteração')
      if (!reason) return
      setPending(true)
      setMessage('')
      try {
        await updateMaintenanceStatus({ id, status: status as 'open' | 'in_progress' | 'awaiting_part' | 'completed', reason })
        setMessage('Status da manutenção atualizado e auditado.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar a manutenção')
      } finally {
        setPending(false)
        }
    }

  return (
    <main className="erp-module-section bg-background text-foreground">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-primary">Operação integrada</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Módulos do ERP</h1>
            <p className="mt-2 text-sm text-muted-foreground">Registre os fatos da operação e deixe os indicadores para o sistema.</p>
          </div>
          <span className="erp-section-kicker">Operação e financeiro</span>
        </div>
        {role === 'accountant' && <div className="mb-6 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">Modo contador: consulte os dados, aplique filtros e faça o fechamento mensal. Alterações operacionais são realizadas pelo administrador.</div>}
        {message && <div className="mb-6 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{message}</div>}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">Mês <input type="month" value={period} onChange={event => setPeriod(event.target.value)} /></label>
          <select className="period-select" value={historyWindow} onChange={event => setHistoryWindow(event.target.value)}><option value="all">Mês selecionado</option><option value="3">Últimos 3 meses</option><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option></select>
          <select className="period-select" value={reportTruckId} onChange={event => setReportTruckId(event.target.value)}><option value="">Todos os caminhões</option>{fleet.map(item => <option key={item.id} value={item.id}>{item.code} · {item.plate}</option>)}</select>
          <select className="period-select" value={reportDriverId} onChange={event => setReportDriverId(event.target.value)}><option value="">Todos os motoristas</option>{team.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button className="secondary-button" type="button" onClick={exportCsv}>Exportar CSV</button>
          <button className="secondary-button" type="button" onClick={exportExcel}>Exportar Excel</button>
          <button className="secondary-button" type="button" onClick={() => window.print()}>Imprimir / PDF</button>
          <button className="secondary-button" type="button" onClick={() => setShowComparison(value => !value)}>Comparar período</button>
          {period && <button className="secondary-button" type="button" onClick={() => setPeriod('')}>Limpar período</button>}
        </div>
        {showComparison && <section className="panel mb-6"><div className="panel-header"><div><h2 className="panel-title">Comparação histórica</h2><p className="panel-subtitle">Período selecionado contra o mês anterior</p></div></div>{period ? <div className="grid gap-3 p-5 sm:grid-cols-3"><ComparisonMetric label="Viagens atuais" value={String(totals.trips)} help={`${variation == null ? 'Sem base histórica' : `${variation.toFixed(1)}% vs. mês anterior`}`} /><ComparisonMetric label="Viagens anteriores" value={String(previousTrips)} help={previousPeriod} /><ComparisonMetric label="Toneladas anteriores" value={previousTons.toLocaleString('pt-BR')} help={previousPeriod} /></div> : <p className="p-5 text-sm text-muted-foreground">Selecione um período mensal para comparar.</p>}</section>}
        <section className="panel mb-6"><div className="panel-header"><div><h2 className="panel-title">Visão operacional</h2><p className="panel-subtitle">Distribuição dos registros no período selecionado</p></div></div><div className="chart-summary p-5"><div><span>Viagens</span><strong>{totals.trips}</strong><i style={{ width: `${Math.min(100, totals.trips * 8)}%` }} /></div><div><span>Toneladas</span><strong>{sumNumbers(filtered.tripRows, item => Number(item.tons)).toLocaleString('pt-BR')}</strong><i style={{ width: `${Math.min(100, sumNumbers(filtered.tripRows, item => Number(item.tons)) / 10)}%` }} /></div><div><span>Litros</span><strong>{sumNumbers(filtered.fuelRows, item => Number(item.liters)).toLocaleString('pt-BR')}</strong><i style={{ width: `${Math.min(100, sumNumbers(filtered.fuelRows, item => Number(item.liters)) / 10)}%` }} /></div></div></section>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="metric-card"><p className="eyebrow">Viagens</p><p className="mt-3 text-2xl font-semibold">{totals.trips}</p><p className="mt-3 text-xs text-muted-foreground">Registros persistidos</p></div>
          <div className="metric-card"><p className="eyebrow">Faturamento</p><p className="mt-3 text-2xl font-semibold">R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p><p className="mt-3 text-xs text-muted-foreground">Receitas registradas</p></div>
          <div className="metric-card"><p className="eyebrow">Despesas</p><p className="mt-3 text-2xl font-semibold">R$ {totals.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p><p className="mt-3 text-xs text-muted-foreground">Custos operacionais</p></div>
          <div className="metric-card"><p className="eyebrow">Combustível</p><p className="mt-3 text-2xl font-semibold">R$ {totals.fuel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p><p className="mt-3 text-xs text-muted-foreground">{sumNumbers(filtered.fuelRows, item => Number(item.liters)).toLocaleString('pt-BR')} litros</p></div>
          <div className="metric-card"><p className="eyebrow">Caminhões parados</p><p className="mt-3 text-2xl font-semibold">{totals.openDowntime}</p><p className="mt-3 text-xs text-muted-foreground">Indisponibilidades abertas</p></div>
          <div className="metric-card"><p className="eyebrow">Resultado</p><p className="mt-3 text-2xl font-semibold">R$ {financial.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p><p className="mt-3 text-xs text-muted-foreground">Receitas menos custos</p></div>
          <div className="metric-card"><p className="eyebrow">Margem</p><p className="mt-3 text-2xl font-semibold">{financial.marginPercent == null ? '—' : `${financial.marginPercent.toFixed(1)}%`}</p><p className="mt-3 text-xs text-muted-foreground">Resultado sobre faturamento</p></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel">
            <div className="panel-header"><div><h2 className="panel-title">Viagem</h2><p className="panel-subtitle">Origem, destino, distância e carga</p></div></div>
            <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={event => run(event, () => createTrip({ truckId, driverId: driverId || undefined, tripDate: form.date, origin: form.origin, destination: form.destination, km: Number(form.km), tons: Number(form.tons) }))}>
              <select required value={form.truckId} onChange={event => set('truckId', event.target.value)}><option value="">Caminhão</option>{fleet.map(item => <option key={item.id} value={item.id}>{item.code} · {item.plate}</option>)}</select>
              <select value={form.driverId} onChange={event => set('driverId', event.target.value)}><option value="">Motorista</option>{team.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input required type="date" value={form.date} onChange={event => set('date', event.target.value)} />
              <input required placeholder="Origem" value={form.origin} onChange={event => set('origin', event.target.value)} />
              <input required placeholder="Destino" value={form.destination} onChange={event => set('destination', event.target.value)} />
              <input required min="0.01" step="0.01" type="number" placeholder="KM" value={form.km} onChange={event => set('km', event.target.value)} />
              <input required min="0" step="0.01" type="number" placeholder="Toneladas" value={form.tons} onChange={event => set('tons', event.target.value)} />
              <button className="primary-button sm:col-span-2" disabled={pending || role === 'accountant'}>Salvar viagem</button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-header"><div><h2 className="panel-title">Manutenção</h2><p className="panel-subtitle">Custos separados e total calculado</p></div></div>
            <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={event => run(event, () => createMaintenance({ truckId, maintenanceDate: form.date, maintenanceType: form.maintenanceType, problem: form.problem, description: form.description, partsCost: Number(form.partsCost || 0), laborCost: Number(form.laborCost || 0), servicesCost: Number(form.servicesCost || 0), workshop: form.workshop }))}>
              <select required className="sm:col-span-2" value={form.truckId} onChange={event => set('truckId', event.target.value)}><option value="">Caminhão</option>{fleet.map(item => <option key={item.id} value={item.id}>{item.code} · {item.plate}</option>)}</select>
              <input required type="date" value={form.date} onChange={event => set('date', event.target.value)} />
              <input required placeholder="Problema" value={form.problem} onChange={event => set('problem', event.target.value)} />
              <select value={form.maintenanceType} onChange={event => set('maintenanceType', event.target.value)}><option value="corrective">Corretiva</option><option value="preventive">Preventiva</option><option value="tire">Pneus</option><option value="oil">Óleo</option></select>
              <input placeholder="Oficina" value={form.workshop} onChange={event => set('workshop', event.target.value)} />
              <input placeholder="Descrição" value={form.description} onChange={event => set('description', event.target.value)} />
              <input min="0" step="0.01" type="number" placeholder="Peças" value={form.partsCost} onChange={event => set('partsCost', event.target.value)} />
              <input min="0" step="0.01" type="number" placeholder="Mão de obra" value={form.laborCost} onChange={event => set('laborCost', event.target.value)} />
              <input min="0" step="0.01" type="number" placeholder="Serviços" value={form.servicesCost} onChange={event => set('servicesCost', event.target.value)} />
              <button className="primary-button sm:col-span-2" disabled={pending || role === 'accountant'}>Salvar manutenção</button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-header"><div><h2 className="panel-title">Indisponibilidade</h2><p className="panel-subtitle">Controle de caminhões parados</p></div></div>
            <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={event => run(event, () => createDowntime({ truckId, reason: form.reason, startedAt: form.startedAt, endedAt: form.endedAt || undefined, description: form.description }))}>
              <select required className="sm:col-span-2" value={form.truckId} onChange={event => set('truckId', event.target.value)}><option value="">Caminhão</option>{fleet.map(item => <option key={item.id} value={item.id}>{item.code} · {item.plate}</option>)}</select>
              <input required placeholder="Motivo" value={form.reason} onChange={event => set('reason', event.target.value)} />
              <input required type="datetime-local" value={form.startedAt} onChange={event => set('startedAt', event.target.value)} />
              <input type="datetime-local" value={form.endedAt} onChange={event => set('endedAt', event.target.value)} />
              <input placeholder="Descrição" value={form.description} onChange={event => set('description', event.target.value)} />
              <button className="primary-button sm:col-span-2" disabled={pending || role === 'accountant'}>Salvar parada</button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-header"><div><h2 className="panel-title">Financeiro</h2><p className="panel-subtitle">Despesas e faturamento por período</p></div></div>
            <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={event => run(event, () => createExpense({ truckId: truckId || undefined, category: form.category, amount: Number(form.amount), expenseDate: form.date, description: form.description }))}>
              <input required placeholder="Categoria da despesa" value={form.category} onChange={event => set('category', event.target.value)} />
              <input required min="0.01" step="0.01" type="number" placeholder="Valor" value={form.amount} onChange={event => set('amount', event.target.value)} />
              <input required type="date" value={form.date} onChange={event => set('date', event.target.value)} />
              <select value={form.truckId} onChange={event => set('truckId', event.target.value)}><option value="">Sem caminhão</option>{fleet.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select>
              <button className="primary-button sm:col-span-2" disabled={pending || role === 'accountant'}>Salvar despesa</button>
            </form>
            <form className="grid gap-3 border-t border-border p-5 sm:grid-cols-2" onSubmit={event => run(event, () => createRevenue({ truckId: truckId || undefined, origin: form.origin, destination: form.destination, amount: Number(form.amount), revenueDate: form.revenueDate, tons: Number(form.tons || 0), trips: Number(form.trips || 0), km: Number(form.km || 0) }))}>
              <input required type="date" value={form.revenueDate} onChange={event => set('revenueDate', event.target.value)} />
              <input required min="0.01" step="0.01" type="number" placeholder="Faturamento" value={form.amount} onChange={event => set('amount', event.target.value)} />
              <input placeholder="Origem" value={form.origin} onChange={event => set('origin', event.target.value)} />
              <input placeholder="Destino" value={form.destination} onChange={event => set('destination', event.target.value)} />
              <button className="primary-button sm:col-span-2" disabled={pending || role === 'accountant'}>Salvar faturamento</button>
            </form>
          </section>
        </div>
        <section id="relatorios" className="panel mt-6">
          <div className="panel-header"><div><h2 className="panel-title">Fechamento mensal</h2><p className="panel-subtitle">Trave o período conferido pelo contador</p></div></div>
          <form className="flex flex-wrap gap-3 p-5" onSubmit={event => run(event, () => startMonthlyReview(form.month))}>
            <input required type="month" value={form.month} onChange={event => set('month', event.target.value)} />
            <button className="secondary-button" disabled={pending || role === 'accountant'}>Iniciar conferência</button>
            <button className="primary-button" type="button" disabled={pending || role === 'accountant'} onClick={() => {
              if (!form.month) {
                setMessage('Mês de referência é obrigatório')
                return
              }
              setPending(true)
              setMessage('')
              closeMonthlyPeriod(form.month)
                .then(() => {
                  setMessage('Mês fechado com sucesso.')
                  router.refresh()
                })
                .catch(error => setMessage(error instanceof Error ? error.message : 'Não foi possível fechar o mês'))
                .finally(() => setPending(false))
            }}>Fechar mês</button>
          </form>
          {data.closureRows.length > 0 && <div className="table-scroll px-5 pb-5"><table><thead><tr><th>Mês</th><th>Status</th></tr></thead><tbody>{data.closureRows.map(item => <tr key={item.id}><td>{formatDate(item.referenceMonth)}</td><td>{item.status}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="panel mt-6">
          <div className="panel-header"><div><h2 className="panel-title">Ranking operacional</h2><p className="panel-subtitle">Ordenado por toneladas registradas no período selecionado</p></div></div>
          {rankingRows.length ? <div className="table-scroll"><table><thead><tr><th>Posição</th><th>Caminhão</th><th>Viagens</th><th>Toneladas</th><th>KM</th></tr></thead><tbody>{rankingRows.map(([truckId, row], index) => <tr key={truckId}><td>{index + 1}</td><td>#{truckId}</td><td>{row.trips}</td><td>{row.tons.toLocaleString('pt-BR')}</td><td>{row.km.toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-muted-foreground">Dados insuficientes para ranking neste período.</p>}
        </section>
        <section className="panel mt-6">
          <div className="panel-header"><div><h2 className="panel-title">Ranking de motoristas</h2><p className="panel-subtitle">Ordenado por toneladas no filtro selecionado; não representa avaliação individual.</p></div></div>
          {driverRankingRows.length ? <div className="table-scroll"><table><thead><tr><th>Motorista</th><th>Viagens</th><th>Toneladas</th><th>KM</th></tr></thead><tbody>{driverRankingRows.map(([name, row]) => <tr key={name}><td>{name}</td><td>{row.trips}</td><td>{row.tons.toLocaleString('pt-BR')}</td><td>{row.km.toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-muted-foreground">Dados insuficientes para ranking de motoristas.</p>}
        </section>
        <section id="configuracoes" className="panel mt-6">
          <div className="panel-header"><div><h2 className="panel-title">Auditoria recente</h2><p className="panel-subtitle">Alterações importantes registradas pelo sistema</p></div></div>
          {data.auditRows.length ? <div className="table-scroll"><table><thead><tr><th>Data</th><th>Entidade</th><th>Ação</th><th>Motivo</th></tr></thead><tbody>{data.auditRows.map(item => <tr key={item.id}><td>{formatDate(item.createdAt)}</td><td>{item.entity} #{item.entityId}</td><td>{item.action}</td><td>{item.reason || '—'}</td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-muted-foreground">Nenhum evento de auditoria registrado.</p>}
        </section>
        <section className="panel mt-6">
          <div className="panel-header"><div><h2 className="panel-title">Alertas operacionais</h2><p className="panel-subtitle">Registre riscos para acompanhamento administrativo</p></div></div>
          <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={event => run(event, () => createAlert({ truckId: truckId || undefined, severity: form.alertSeverity as 'info' | 'warning' | 'critical', title: form.alertTitle, message: form.alertMessage }))}>
            <select value={form.alertSeverity} onChange={event => set('alertSeverity', event.target.value)}><option value="info">Informação</option><option value="warning">Atenção</option><option value="critical">Crítico</option></select>
            <select value={form.truckId} onChange={event => set('truckId', event.target.value)}><option value="">Sem caminhão</option>{fleet.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select>
            <input required className="sm:col-span-2" placeholder="Título do alerta" value={form.alertTitle} onChange={event => set('alertTitle', event.target.value)} />
            <textarea required className="sm:col-span-2" placeholder="Mensagem" value={form.alertMessage} onChange={event => set('alertMessage', event.target.value)} />
            <button className="primary-button sm:col-span-2" disabled={pending || role === 'accountant'}>Criar alerta</button>
          </form>
          {data.alertRows.length > 0 && <div className="table-scroll px-5 pb-5"><table><thead><tr><th>Severidade</th><th>Título</th><th>Mensagem</th></tr></thead><tbody>{data.alertRows.slice(0, 10).map(item => <tr key={item.id}><td>{item.severity}</td><td>{item.title}</td><td>{item.message}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="panel mt-6">
          <div className="panel-header"><div><h2 className="panel-title">Registros recentes</h2><p className="panel-subtitle">Dados reais armazenados no MySQL</p></div></div>
          <div className="grid gap-6 p-5 xl:grid-cols-2">
            <div><h3 className="mb-3 font-medium">Viagens</h3>{filtered.tripRows.length ? <div className="table-scroll"><table><thead><tr><th>Data</th><th>Rota</th><th>KM</th><th></th></tr></thead><tbody>{filtered.tripRows.slice(0, 10).map(item => <tr key={item.id}><td>{formatDate(item.tripDate)}</td><td>{item.origin} → {item.destination}</td><td>{item.km}</td><td><button className="text-xs text-destructive" disabled={pending} onClick={() => remove(() => deleteTrip(item.id))}>Excluir</button></td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Nenhuma viagem registrada.</p>}</div>
              <div><h3 className="mb-3 font-medium">Manutenções</h3>{filtered.maintenanceRows.length ? <div className="table-scroll"><table><thead><tr><th>Data</th><th>Problema</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{filtered.maintenanceRows.slice(0, 10).map(item => <tr key={item.id}><td>{formatDate(item.maintenanceDate)}</td><td>{item.problem}</td><td>R$ {Number(item.totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td>{item.status}</td><td><button className="text-xs text-primary" disabled={pending || role === 'accountant'} onClick={() => changeMaintenanceStatus(item.id)}>Alterar status</button>{role === 'admin' && <button className="ml-3 text-xs text-destructive" disabled={pending} onClick={() => remove(() => deleteMaintenance(item.id))}>Excluir</button>}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada.</p>}</div>
              <div><h3 className="mb-3 font-medium">Despesas</h3>{filtered.expenseRows.length ? <div className="table-scroll"><table><thead><tr><th>Data</th><th>Categoria</th><th>Valor</th><th></th></tr></thead><tbody>{filtered.expenseRows.slice(0, 10).map(item => <tr key={item.id}><td>{formatDate(item.expenseDate)}</td><td>{item.category}</td><td>R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td><button className="text-xs text-destructive" disabled={pending} onClick={() => remove(() => deleteExpense(item.id))}>Excluir</button></td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>}</div>
              <div><h3 className="mb-3 font-medium">Faturamento</h3>{filtered.revenueRows.length ? <div className="table-scroll"><table><thead><tr><th>Data</th><th>Rota</th><th>Valor</th><th></th></tr></thead><tbody>{filtered.revenueRows.slice(0, 10).map(item => <tr key={item.id}><td>{formatDate(item.revenueDate)}</td><td>{item.origin || '—'} → {item.destination || '—'}</td><td>R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td><button className="text-xs text-destructive" disabled={pending} onClick={() => remove(() => deleteRevenue(item.id))}>Excluir</button></td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Nenhum faturamento registrado.</p>}</div>
          </div>
        </section>
      </div>
    </main>
  )
}
