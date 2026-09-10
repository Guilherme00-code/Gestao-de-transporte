'use client'

import { FormEvent, useState } from 'react'
import {
  createAlertRule,
  createBenchmark,
  createIncident,
  createPreventiveRule,
  markNotificationRead,
} from '@/app/actions/advanced'

type FleetItem = { id: number; code: string; plate: string }
type DriverItem = { id: number; name: string }
type AdvancedData = {
  preventive: Array<{ id: number; name: string; component: string; intervalKm: string | null; intervalDays: number | null }>
  benchmarks: Array<{ id: number; metric: string; source: string; targetValue: string }>
  incidents: Array<{ id: number; category: string; description: string; status: string }>
  notifications: Array<{ id: number; category: string; title: string; message: string }>
  alertRules: Array<{ id: number; category: string; metric: string; warningPercent: string; criticalPercent: string }>
}

export default function AdvancedModules({ fleet, team, data }: { fleet: FleetItem[]; team: DriverItem[]; data: AdvancedData }) {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [truckId, setTruckId] = useState(String(fleet[0]?.id ?? ''))
  const [driverId, setDriverId] = useState(String(team[0]?.id ?? ''))
  const run = async (event: FormEvent, action: () => Promise<void>) => {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try { await action(); setMessage('Registro avançado salvo com sucesso.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar') }
    finally { setPending(false) }
  }
  return (
    <main className="min-h-screen bg-background px-4 pb-12 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 border-t border-border pt-8">
          <p className="eyebrow text-primary">Camada avançada</p>
          <h2 className="mt-2 text-2xl font-semibold">Prevenção, contexto e alertas configuráveis</h2>
          <p className="mt-2 text-sm text-muted-foreground">Os registros abaixo alimentam análises sem afirmar causalidade sem evidência.</p>
        </div>
        {message && <div className="mb-5 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{message}</div>}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel">
            <h3 className="panel-title">Manutenção preventiva</h3>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={event => run(event, () => createPreventiveRule({ truckId: Number(truckId), name: (event.currentTarget.elements.namedItem('name') as HTMLInputElement).value, component: (event.currentTarget.elements.namedItem('component') as HTMLInputElement).value, intervalKm: Number((event.currentTarget.elements.namedItem('intervalKm') as HTMLInputElement).value) || undefined, intervalDays: Number((event.currentTarget.elements.namedItem('intervalDays') as HTMLInputElement).value) || undefined }))}>
              <select className="period-select" value={truckId} onChange={event => setTruckId(event.target.value)}><option value="">Todos os caminhões</option>{fleet.map(truck => <option key={truck.id} value={truck.id}>{truck.code} · {truck.plate}</option>)}</select>
              <input className="period-select" name="name" placeholder="Nome da revisão" required />
              <input className="period-select" name="component" placeholder="Componente" required />
              <input className="period-select" name="intervalKm" type="number" placeholder="Intervalo em KM" min="1" />
              <input className="period-select" name="intervalDays" type="number" placeholder="Intervalo em dias" min="1" />
              <button className="primary-button" disabled={pending}>Adicionar regra</button>
            </form>
            <div className="table-scroll mt-4"><table><tbody>{data.preventive.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.component}</td><td>{item.intervalKm ? `${item.intervalKm} km` : `${item.intervalDays} dias`}</td></tr>)}</tbody></table></div>
          </section>
          <section className="panel">
            <h3 className="panel-title">Benchmark operacional/técnico</h3>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={event => run(event, () => createBenchmark({ truckId: Number(truckId), metric: (event.currentTarget.elements.namedItem('metric') as HTMLInputElement).value, source: (event.currentTarget.elements.namedItem('source') as HTMLSelectElement).value as 'technical' | 'operational', targetValue: Number((event.currentTarget.elements.namedItem('target') as HTMLInputElement).value), validFrom: (event.currentTarget.elements.namedItem('validFrom') as HTMLInputElement).value }))}>
              <input className="period-select" name="metric" placeholder="Indicador (ex.: km_l)" required />
              <select className="period-select" name="source"><option value="operational">Histórico operacional</option><option value="technical">Referência técnica</option></select>
              <input className="period-select" name="target" type="number" step="0.001" placeholder="Valor de referência" required />
              <input className="period-select" name="validFrom" type="date" required />
              <button className="primary-button" disabled={pending}>Adicionar benchmark</button>
            </form>
            <div className="table-scroll mt-4"><table><tbody>{data.benchmarks.map(item => <tr key={item.id}><td>{item.metric}</td><td>{item.source === 'operational' ? 'Operacional' : 'Técnico'}</td><td>{item.targetValue}</td></tr>)}</tbody></table></div>
          </section>
          <section className="panel">
            <h3 className="panel-title">Ocorrências / problemas</h3>
            <form className="mt-4 grid gap-3" onSubmit={event => run(event, () => createIncident({ truckId: Number(truckId), driverId: Number(driverId), category: (event.currentTarget.elements.namedItem('incidentCategory') as HTMLInputElement).value, description: (event.currentTarget.elements.namedItem('incidentDescription') as HTMLTextAreaElement).value }))}>
              <div className="flex gap-2"><select className="period-select flex-1" value={truckId} onChange={event => setTruckId(event.target.value)}>{fleet.map(truck => <option key={truck.id} value={truck.id}>{truck.code} · {truck.plate}</option>)}</select><select className="period-select flex-1" value={driverId} onChange={event => setDriverId(event.target.value)}>{team.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></div>
              <input className="period-select" name="incidentCategory" placeholder="Categoria" required />
              <textarea className="period-select" name="incidentDescription" placeholder="Descreva o ocorrido" required />
              <button className="primary-button" disabled={pending}>Registrar ocorrência</button>
            </form>
            <div className="table-scroll mt-4"><table><tbody>{data.incidents.map(item => <tr key={item.id}><td>{item.category}</td><td>{item.description}</td><td>{item.status}</td></tr>)}</tbody></table></div>
          </section>
          <section className="panel">
            <h3 className="panel-title">Notificações pendentes e limites</h3>
            {data.notifications.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhuma notificação pendente.</p> : data.notifications.map(item => <div className="alert-row" key={item.id}><div><strong className="alert-title">{item.title}</strong><p className="alert-text">{item.message}</p></div><button className="text-button" onClick={() => markNotificationRead(item.id)}>Marcar lida</button></div>)}
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={event => run(event, () => createAlertRule({ category: (event.currentTarget.elements.namedItem('ruleCategory') as HTMLInputElement).value, metric: (event.currentTarget.elements.namedItem('ruleMetric') as HTMLInputElement).value, warningPercent: Number((event.currentTarget.elements.namedItem('warning') as HTMLInputElement).value), criticalPercent: Number((event.currentTarget.elements.namedItem('critical') as HTMLInputElement).value) }))}>
              <input className="period-select" name="ruleCategory" placeholder="Categoria" required />
              <input className="period-select" name="ruleMetric" placeholder="Indicador" required />
              <input className="period-select" name="warning" type="number" placeholder="Atenção %" required />
              <input className="period-select" name="critical" type="number" placeholder="Alerta %" required />
              <button className="primary-button" disabled={pending}>Configurar limite</button>
            </form>
            <div className="mt-4 text-xs text-muted-foreground">{data.alertRules.length} regra(s) configurada(s).</div>
          </section>
        </div>
      </div>
    </main>
  )
}
