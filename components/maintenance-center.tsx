'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMaintenance } from '@/app/actions/erp'

type Truck = { id: number; code: string; plate: string }
type RecordRow = { id: number; truckId: number; maintenanceDate: string | Date; maintenanceType: string; problem: string; partsCost: string; laborCost: string; servicesCost?: string; status: string }
type Plan = { id: number; truckId: number | null; name: string; component: string; intervalKm: string | null; intervalDays: number | null }

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const labels: Record<string, string> = { agendada: 'Agendada', proxima: 'Próxima', em_manutencao: 'Em manutenção', aguardando_peca: 'Aguardando peça', aguardando_servico: 'Aguardando serviço', finalizada: 'Finalizada', cancelada: 'Cancelada' }

function date(value: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value))
}

export default function MaintenanceCenter({ fleet, records, plans, canEdit }: { fleet: Truck[]; records: RecordRow[]; plans: Plan[]; canEdit: boolean }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [period, setPeriod] = useState('all')
  const [form, setForm] = useState({ truckId: String(fleet[0]?.id ?? ''), maintenanceDate: new Date().toISOString().slice(0, 10), maintenanceType: 'preventiva', problem: '', description: '', partsCost: '', laborCost: '', servicesCost: '', workshop: '' })
  const filtered = useMemo(() => {
    if (period === 'all') return records
    const days = Number(period)
    const start = Date.now() - days * 86400000
    return records.filter(item => new Date(item.maintenanceDate).getTime() >= start)
  }, [records, period])
  const totalCost = filtered.reduce((sum, item) => sum + Number(item.partsCost) + Number(item.laborCost) + Number(item.servicesCost), 0)
  const open = filtered.filter(item => !['finalizada', 'cancelada'].includes(item.status))
  const overdue = filtered.filter(item => !['finalizada', 'cancelada'].includes(item.status) && new Date(item.maintenanceDate).getTime() < Date.now())
  const byTruck = new Map(fleet.map(item => [item.id, item]))
  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try {
      await createMaintenance({ ...form, truckId: Number(form.truckId), partsCost: Number(form.partsCost || 0), laborCost: Number(form.laborCost || 0), servicesCost: Number(form.servicesCost || 0) })
      setShowForm(false)
      setMessage('Manutenção cadastrada e incluída na central preventiva.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível cadastrar a manutenção.')
    } finally {
      setPending(false)
    }
  }
  return <section className="space-y-5">
    <div className="module-heading"><div><p className="eyebrow">CENTRAL DE PREVENÇÃO</p><h2>Manutenção</h2><p className="muted">Antecipe prazos e acompanhe custos com os dados reais da frota.</p></div>{canEdit && <button className="primary-action" type="button" onClick={() => setShowForm(true)}>Nova manutenção</button>}</div>
    {message && <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{message}</div>}
    <div className="metrics-grid"><article className="metric-card"><p className="eyebrow">Em manutenção</p><p className="metric-value">{open.length}</p><p className="metric-help">Registros abertos no período</p></article><article className="metric-card"><p className="eyebrow">Próximas/vencidas</p><p className="metric-value">{overdue.length}</p><p className="metric-help">Precisam de atenção</p></article><article className="metric-card"><p className="eyebrow">Custo de manutenção</p><p className="metric-value">{money.format(totalCost)}</p><p className="metric-help">Peças + mão de obra</p></article><article className="metric-card"><p className="eyebrow">Planos preventivos</p><p className="metric-value">{plans.length}</p><p className="metric-help">Itens cadastrados</p></article></div>
    <div className="toolbar"><label className="text-sm text-muted-foreground">Período <select className="period-select ml-2" value={period} onChange={event => setPeriod(event.target.value)}><option value="all">Todos</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Últimos 12 meses</option></select></label></div>
    <section className="panel"><div className="panel-header"><div><h3 className="panel-title">Histórico de manutenção</h3><p className="panel-subtitle">Nenhum diagnóstico mecânico é feito; os alertas são indicadores de gestão.</p></div></div>{filtered.length ? <div className="table-scroll"><table><thead><tr><th>Data</th><th>Caminhão</th><th>Tipo</th><th>Problema</th><th>Status</th><th>Custo</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td>{date(item.maintenanceDate)}</td><td>{byTruck.get(item.truckId)?.code ?? `#${item.truckId}`}</td><td>{item.maintenanceType}</td><td>{item.problem}</td><td><span className="status-badge">{labels[item.status] ?? item.status}</span></td><td>{money.format(Number(item.partsCost) + Number(item.laborCost) + Number(item.servicesCost))}</td></tr>)}</tbody></table></div> : <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma manutenção registrada no período selecionado.</div>}</section>
    {showForm && <div className="modal-backdrop"><form className="confirm-modal grid gap-3 sm:grid-cols-2" onSubmit={submit}><div className="sm:col-span-2"><h3>Nova manutenção</h3><p className="muted">Os custos serão calculados automaticamente.</p></div><label>Caminhão<select required value={form.truckId} onChange={event => setForm({ ...form, truckId: event.target.value })}>{fleet.map(item => <option key={item.id} value={item.id}>{item.code} · {item.plate}</option>)}</select></label><label>Data<input required type="date" value={form.maintenanceDate} onChange={event => setForm({ ...form, maintenanceDate: event.target.value })} /></label><label>Tipo<select value={form.maintenanceType} onChange={event => setForm({ ...form, maintenanceType: event.target.value })}><option value="preventiva">Preventiva</option><option value="corretiva">Corretiva</option><option value="inspecao">Inspeção</option><option value="revisao">Revisão</option><option value="emergencial">Emergencial</option></select></label><label>Problema<input required value={form.problem} onChange={event => setForm({ ...form, problem: event.target.value })} /></label><label className="sm:col-span-2">Descrição<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label><label>Peças<input min="0" step="0.01" type="number" value={form.partsCost} onChange={event => setForm({ ...form, partsCost: event.target.value })} /></label><label>Mão de obra<input min="0" step="0.01" type="number" value={form.laborCost} onChange={event => setForm({ ...form, laborCost: event.target.value })} /></label><label>Serviços<input min="0" step="0.01" type="number" value={form.servicesCost} onChange={event => setForm({ ...form, servicesCost: event.target.value })} /></label><label>Oficina<input value={form.workshop} onChange={event => setForm({ ...form, workshop: event.target.value })} /></label><div className="modal-actions sm:col-span-2"><button type="button" className="secondary-button" onClick={() => setShowForm(false)} disabled={pending}>Cancelar</button><button className="primary-action" disabled={pending}>{pending ? 'Salvando...' : 'Salvar manutenção'}</button></div></form></div>}
  </section>
}
