'use client'

import { FormEvent, useMemo, useState } from 'react'
import {
  closeMonthlyPeriod,
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
  deleteTrip,
} from '@/app/actions/erp'

type FleetItem = { id: number; code: string; plate: string; brand: string; model: string }
type DriverItem = { id: number; name: string }
type ErpData = {
  tripRows: Array<{ id: number; tripDate: string | Date; origin: string; destination: string; km: string; tons: string }>
  maintenanceRows: Array<{ id: number; maintenanceDate: string | Date; problem: string; totalCost: string; status: string }>
  downtimeRows: Array<{ id: number; startedAt: string | Date; reason: string; status: string }>
  expenseRows: Array<{ id: number; expenseDate: string | Date; category: string; amount: string }>
  revenueRows: Array<{ id: number; revenueDate: string | Date; amount: string; origin: string | null; destination: string | null }>
  alertRows: Array<{ id: number; severity: string; title: string; message: string }>
  closureRows: Array<{ id: number; referenceMonth: string | Date; status: string }>
}

type Props = { fleet: FleetItem[]; team: DriverItem[]; data: ErpData }
type FormState = Record<string, string>

const initial: FormState = {
  truckId: '', driverId: '', date: '', origin: '', destination: '', km: '', tons: '',
  problem: '', description: '', partsCost: '', laborCost: '', servicesCost: '', workshop: '',
  reason: '', startedAt: '', endedAt: '', category: '', amount: '', revenueDate: '',
  month: '', alertTitle: '', alertMessage: '', alertSeverity: 'warning',
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export default function ErpModules({ fleet, team, data }: Props) {
  const [form, setForm] = useState<FormState>({ ...initial, truckId: String(fleet[0]?.id ?? ''), driverId: String(team[0]?.id ?? '') })
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [period, setPeriod] = useState('')
  const set = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }))
  const run = async (event: FormEvent, action: () => Promise<void>) => {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try {
      await action()
      setMessage('Registro salvo com sucesso. Atualize a página para consultar os dados.')
      setForm(current => ({ ...initial, truckId: current.truckId, driverId: current.driverId }))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar')
    } finally {
      setPending(false)
    }
  }
  const truckId = Number(form.truckId)
  const driverId = Number(form.driverId)
  const filtered = useMemo(() => {
    if (!period) return data
    const matches = (value: string | Date) => formatDate(value).slice(3).split('/').reverse().join('-') === period
    return {
      ...data,
      tripRows: data.tripRows.filter(item => matches(item.tripDate)),
      maintenanceRows: data.maintenanceRows.filter(item => matches(item.maintenanceDate)),
      expenseRows: data.expenseRows.filter(item => matches(item.expenseDate)),
      revenueRows: data.revenueRows.filter(item => matches(item.revenueDate)),
    }
  }, [data, period])
  const totals = {
    revenue: filtered.revenueRows.reduce((sum, item) => sum + Number(item.amount), 0),
    expenses: filtered.expenseRows.reduce((sum, item) => sum + Number(item.amount), 0),
    trips: filtered.tripRows.length,
    maintenance: filtered.maintenanceRows.reduce((sum, item) => sum + Number(item.totalCost), 0),
  }
  const exportCsv = () => {
    const rows = [
      ['tipo', 'data', 'descricao', 'valor'],
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

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-primary">Operação integrada</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Módulos do ERP</h1>
            <p className="mt-2 text-sm text-muted-foreground">Registre os fatos da operação e deixe os indicadores para o sistema.</p>
          </div>
          <a className="secondary-button" href="/">Voltar ao painel</a>
        </div>
        {message && <div className="mb-6 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{message}</div>}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">Período <input type="month" value={period} onChange={event => setPeriod(event.target.value)} /></label>
          <button className="secondary-button" type="button" onClick={exportCsv}>Exportar CSV</button>
          {period && <button className="secondary-button" type="button" onClick={() => setPeriod('')}>Limpar período</button>}
        </div>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="metric-card"><p className="eyebrow">Viagens</p><p className="mt-3 text-2xl font-semibold">{totals.trips}</p><p className="mt-3 text-xs text-muted-foreground">Registros persistidos</p></div>
          <div className="metric-card"><p className="eyebrow">Faturamento</p><p className="mt-3 text-2xl font-semibold">R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p><p className="mt-3 text-xs text-muted-foreground">Receitas registradas</p></div>
          <div className="metric-card"><p className="eyebrow">Despesas</p><p className="mt-3 text-2xl font-semibold">R$ {totals.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p><p className="mt-3 text-xs text-muted-foreground">Custos operacionais</p></div>
          <div className="metric-card"><p className="eyebrow">Resultado</p><p className="mt-3 text-2xl font-semibold">R$ {(totals.revenue - totals.expenses - totals.maintenance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p><p className="mt-3 text-xs text-muted-foreground">Receitas menos custos</p></div>
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
              <button className="primary-button sm:col-span-2" disabled={pending}>Salvar viagem</button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-header"><div><h2 className="panel-title">Manutenção</h2><p className="panel-subtitle">Custos separados e total calculado</p></div></div>
            <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={event => run(event, () => createMaintenance({ truckId, maintenanceDate: form.date, problem: form.problem, description: form.description, partsCost: Number(form.partsCost || 0), laborCost: Number(form.laborCost || 0), servicesCost: Number(form.servicesCost || 0), workshop: form.workshop }))}>
              <select required className="sm:col-span-2" value={form.truckId} onChange={event => set('truckId', event.target.value)}><option value="">Caminhão</option>{fleet.map(item => <option key={item.id} value={item.id}>{item.code} · {item.plate}</option>)}</select>
              <input required type="date" value={form.date} onChange={event => set('date', event.target.value)} />
              <input required placeholder="Problema" value={form.problem} onChange={event => set('problem', event.target.value)} />
              <input placeholder="Oficina" value={form.workshop} onChange={event => set('workshop', event.target.value)} />
              <input placeholder="Descrição" value={form.description} onChange={event => set('description', event.target.value)} />
              <input min="0" step="0.01" type="number" placeholder="Peças" value={form.partsCost} onChange={event => set('partsCost', event.target.value)} />
              <input min="0" step="0.01" type="number" placeholder="Mão de obra" value={form.laborCost} onChange={event => set('laborCost', event.target.value)} />
              <input min="0" step="0.01" type="number" placeholder="Serviços" value={form.servicesCost} onChange={event => set('servicesCost', event.target.value)} />
              <button className="primary-button sm:col-span-2" disabled={pending}>Salvar manutenção</button>
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
              <button className="primary-button sm:col-span-2" disabled={pending}>Salvar parada</button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-header"><div><h2 className="panel-title">Financeiro</h2><p className="panel-subtitle">Despesas e faturamento por período</p></div></div>
            <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={event => run(event, () => createExpense({ truckId: truckId || undefined, category: form.category, amount: Number(form.amount), expenseDate: form.date, description: form.description }))}>
              <input required placeholder="Categoria da despesa" value={form.category} onChange={event => set('category', event.target.value)} />
              <input required min="0.01" step="0.01" type="number" placeholder="Valor" value={form.amount} onChange={event => set('amount', event.target.value)} />
              <input required type="date" value={form.date} onChange={event => set('date', event.target.value)} />
              <select value={form.truckId} onChange={event => set('truckId', event.target.value)}><option value="">Sem caminhão</option>{fleet.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select>
              <button className="primary-button sm:col-span-2" disabled={pending}>Salvar despesa</button>
            </form>
            <form className="grid gap-3 border-t border-border p-5 sm:grid-cols-2" onSubmit={event => run(event, () => createRevenue({ truckId: truckId || undefined, origin: form.origin, destination: form.destination, amount: Number(form.amount), revenueDate: form.revenueDate, tons: Number(form.tons || 0), trips: Number(form.trips || 0), km: Number(form.km || 0) }))}>
              <input required type="date" value={form.revenueDate} onChange={event => set('revenueDate', event.target.value)} />
              <input required min="0.01" step="0.01" type="number" placeholder="Faturamento" value={form.amount} onChange={event => set('amount', event.target.value)} />
              <input placeholder="Origem" value={form.origin} onChange={event => set('origin', event.target.value)} />
              <input placeholder="Destino" value={form.destination} onChange={event => set('destination', event.target.value)} />
              <button className="primary-button sm:col-span-2" disabled={pending}>Salvar faturamento</button>
            </form>
          </section>
        </div>
        <section className="panel mt-6">
          <div className="panel-header"><div><h2 className="panel-title">Fechamento mensal</h2><p className="panel-subtitle">Trave o período conferido pelo contador</p></div></div>
          <form className="flex flex-wrap gap-3 p-5" onSubmit={event => run(event, () => closeMonthlyPeriod(form.month))}>
            <input required type="month" value={form.month} onChange={event => set('month', event.target.value)} />
            <button className="primary-button" disabled={pending}>Fechar mês</button>
          </form>
          {data.closureRows.length > 0 && <div className="table-scroll px-5 pb-5"><table><thead><tr><th>Mês</th><th>Status</th></tr></thead><tbody>{data.closureRows.map(item => <tr key={item.id}><td>{formatDate(item.referenceMonth)}</td><td>{item.status}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="panel mt-6">
          <div className="panel-header"><div><h2 className="panel-title">Alertas operacionais</h2><p className="panel-subtitle">Registre riscos para acompanhamento administrativo</p></div></div>
          <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={event => run(event, () => createAlert({ truckId: truckId || undefined, severity: form.alertSeverity as 'info' | 'warning' | 'critical', title: form.alertTitle, message: form.alertMessage }))}>
            <select value={form.alertSeverity} onChange={event => set('alertSeverity', event.target.value)}><option value="info">Informação</option><option value="warning">Atenção</option><option value="critical">Crítico</option></select>
            <select value={form.truckId} onChange={event => set('truckId', event.target.value)}><option value="">Sem caminhão</option>{fleet.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select>
            <input required className="sm:col-span-2" placeholder="Título do alerta" value={form.alertTitle} onChange={event => set('alertTitle', event.target.value)} />
            <textarea required className="sm:col-span-2" placeholder="Mensagem" value={form.alertMessage} onChange={event => set('alertMessage', event.target.value)} />
            <button className="primary-button sm:col-span-2" disabled={pending}>Criar alerta</button>
          </form>
          {data.alertRows.length > 0 && <div className="table-scroll px-5 pb-5"><table><thead><tr><th>Severidade</th><th>Título</th><th>Mensagem</th></tr></thead><tbody>{data.alertRows.slice(0, 10).map(item => <tr key={item.id}><td>{item.severity}</td><td>{item.title}</td><td>{item.message}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="panel mt-6">
          <div className="panel-header"><div><h2 className="panel-title">Registros recentes</h2><p className="panel-subtitle">Dados reais armazenados no MySQL</p></div></div>
          <div className="grid gap-6 p-5 xl:grid-cols-2">
            <div><h3 className="mb-3 font-medium">Viagens</h3>{filtered.tripRows.length ? <div className="table-scroll"><table><thead><tr><th>Data</th><th>Rota</th><th>KM</th><th></th></tr></thead><tbody>{filtered.tripRows.slice(0, 10).map(item => <tr key={item.id}><td>{formatDate(item.tripDate)}</td><td>{item.origin} → {item.destination}</td><td>{item.km}</td><td><button className="text-xs text-destructive" disabled={pending} onClick={() => remove(() => deleteTrip(item.id))}>Excluir</button></td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Nenhuma viagem registrada.</p>}</div>
              <div><h3 className="mb-3 font-medium">Manutenções</h3>{filtered.maintenanceRows.length ? <div className="table-scroll"><table><thead><tr><th>Data</th><th>Problema</th><th>Total</th><th></th></tr></thead><tbody>{filtered.maintenanceRows.slice(0, 10).map(item => <tr key={item.id}><td>{formatDate(item.maintenanceDate)}</td><td>{item.problem}</td><td>R$ {Number(item.totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td><button className="text-xs text-destructive" disabled={pending} onClick={() => remove(() => deleteMaintenance(item.id))}>Excluir</button></td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada.</p>}</div>
              <div><h3 className="mb-3 font-medium">Despesas</h3>{filtered.expenseRows.length ? <div className="table-scroll"><table><thead><tr><th>Data</th><th>Categoria</th><th>Valor</th><th></th></tr></thead><tbody>{filtered.expenseRows.slice(0, 10).map(item => <tr key={item.id}><td>{formatDate(item.expenseDate)}</td><td>{item.category}</td><td>R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td><button className="text-xs text-destructive" disabled={pending} onClick={() => remove(() => deleteExpense(item.id))}>Excluir</button></td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>}</div>
              <div><h3 className="mb-3 font-medium">Faturamento</h3>{filtered.revenueRows.length ? <div className="table-scroll"><table><thead><tr><th>Data</th><th>Rota</th><th>Valor</th><th></th></tr></thead><tbody>{filtered.revenueRows.slice(0, 10).map(item => <tr key={item.id}><td>{formatDate(item.revenueDate)}</td><td>{item.origin || '—'} → {item.destination || '—'}</td><td>R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td><button className="text-xs text-destructive" disabled={pending} onClick={() => remove(() => deleteRevenue(item.id))}>Excluir</button></td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Nenhum faturamento registrado.</p>}</div>
          </div>
        </section>
      </div>
    </main>
  )
}
