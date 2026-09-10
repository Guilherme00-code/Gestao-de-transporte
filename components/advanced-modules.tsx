'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createAlertRule,
  createBenchmark,
  createIncident,
  createPreventiveRule,
  markNotificationRead,
  saveSetting,
  createRevenueRule,
  createExpenseCategory,
  updateManagedUserRole,
} from '@/app/actions/advanced'

type FleetItem = { id: number; code: string; plate: string }
type DriverItem = { id: number; name: string }
type AdvancedData = {
  preventive: Array<{ id: number; name: string; component: string; intervalKm: string | null; intervalDays: number | null }>
  benchmarks: Array<{ id: number; metric: string; source: string; targetValue: string }>
  incidents: Array<{ id: number; category: string; description: string; status: string }>
  notifications: Array<{ id: number; category: string; title: string; message: string }>
  alertRules: Array<{ id: number; category: string; metric: string; warningPercent: string; criticalPercent: string }>
  managedUsers?: Array<{ id: string; name: string; email: string; role: string }>
}

export default function AdvancedModules({ fleet, team, data, role }: { fleet: FleetItem[]; team: DriverItem[]; data: AdvancedData; role: 'admin' | 'accountant' }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [truckId, setTruckId] = useState(String(fleet[0]?.id ?? ''))
  const [driverId, setDriverId] = useState(String(team[0]?.id ?? ''))
  const run = async (event: FormEvent, action: () => Promise<void>) => {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try { await action(); setMessage('Registro avançado salvo com sucesso.'); router.refresh() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar') }
    finally { setPending(false) }
  }
  const changeUserRole = async (userId: string, nextRole: 'admin' | 'accountant' | 'driver') => {
    setPending(true)
    setMessage('')
    try {
      await updateManagedUserRole({ userId, role: nextRole })
      setMessage('Perfil atualizado com sucesso.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o perfil')
    } finally {
      setPending(false)
    }
  }
  return (
    <main className="erp-module-section bg-background text-foreground">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 border-t border-border pt-8">
          <p className="eyebrow text-primary">Camada avançada</p>
          <h2 className="mt-2 text-2xl font-semibold">Prevenção, contexto e alertas configuráveis</h2>
          <p className="mt-2 text-sm text-muted-foreground">Os registros abaixo alimentam análises sem afirmar causalidade sem evidência.</p>
        </div>
        {role === 'accountant' && <div className="mb-5 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">Modo contador: benchmarks, regras e ocorrências são administrados pelo proprietário. Esta área está disponível para consulta.</div>}
        {message && <div className="mb-5 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{message}</div>}
        {role === 'admin' && <section className="erp-guide mb-6"><div><p className="eyebrow text-primary">Administração</p><h3 className="mt-1 text-lg font-semibold">Organize sua empresa em quatro passos</h3><p className="mt-1 text-sm text-muted-foreground">Cadastre usuários, vincule motoristas aos caminhões, configure regras e acompanhe os indicadores.</p></div><div className="erp-guide-steps"><span><b>1</b> Usuários</span><span><b>2</b> Frota</span><span><b>3</b> Regras</span><span><b>4</b> Indicadores</span></div></section>}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel">
            <h3 className="panel-title">Manutenção preventiva</h3>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={event => run(event, () => createPreventiveRule({ truckId: Number(truckId), name: (event.currentTarget.elements.namedItem('name') as HTMLInputElement).value, component: (event.currentTarget.elements.namedItem('component') as HTMLInputElement).value, intervalKm: Number((event.currentTarget.elements.namedItem('intervalKm') as HTMLInputElement).value) || undefined, intervalDays: Number((event.currentTarget.elements.namedItem('intervalDays') as HTMLInputElement).value) || undefined }))}>
              <select className="period-select" value={truckId} onChange={event => setTruckId(event.target.value)}><option value="">Todos os caminhões</option>{fleet.map(truck => <option key={truck.id} value={truck.id}>{truck.code} · {truck.plate}</option>)}</select>
              <input className="period-select" name="name" placeholder="Nome da revisão" required />
              <input className="period-select" name="component" placeholder="Componente" required />
              <input className="period-select" name="intervalKm" type="number" placeholder="Intervalo em KM" min="1" />
              <input className="period-select" name="intervalDays" type="number" placeholder="Intervalo em dias" min="1" />
              <button className="primary-button" disabled={pending || role === 'accountant'}>Adicionar regra</button>
            </form>
            <div className="table-scroll mt-4"><table><tbody>{data.preventive.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.component}</td><td>{item.intervalKm ? `${item.intervalKm} km` : `${item.intervalDays} dias`}</td></tr>)}</tbody></table></div>
          </section>
          <section id="configuracoes-empresa" className="panel lg:col-span-2">
            <h3 className="panel-title">Configurações da empresa</h3>
            <p className="panel-subtitle">Regras persistidas para cobrança, custos e parâmetros operacionais.</p>
            <div className="mt-4 grid gap-6 lg:grid-cols-3">
              <form className="grid gap-3" onSubmit={event => run(event, () => saveSetting({ key: (event.currentTarget.elements.namedItem('settingKey') as HTMLInputElement).value, value: (event.currentTarget.elements.namedItem('settingValue') as HTMLInputElement).value }))}>
                <input className="period-select" name="settingKey" placeholder="Chave (ex.: empresa.nome)" required />
                <input className="period-select" name="settingValue" placeholder="Valor" required />
                <button className="primary-button" disabled={pending || role === 'accountant'}>Salvar parâmetro</button>
              </form>
              <form className="grid gap-3" onSubmit={event => run(event, () => createRevenueRule({ name: (event.currentTarget.elements.namedItem('ruleName') as HTMLInputElement).value, billingType: (event.currentTarget.elements.namedItem('billingType') as HTMLSelectElement).value as 'ton' | 'trip' | 'km' | 'route', origin: (event.currentTarget.elements.namedItem('origin') as HTMLInputElement).value, destination: (event.currentTarget.elements.namedItem('destination') as HTMLInputElement).value, rate: Number((event.currentTarget.elements.namedItem('rate') as HTMLInputElement).value), validFrom: (event.currentTarget.elements.namedItem('validFrom') as HTMLInputElement).value }))}>
                <input className="period-select" name="ruleName" placeholder="Nome da cobrança" required />
                <select className="period-select" name="billingType"><option value="ton">Por tonelada</option><option value="trip">Por viagem</option><option value="km">Por KM</option><option value="route">Por rota</option></select>
                <input className="period-select" name="origin" placeholder="Origem (opcional)" />
                <input className="period-select" name="destination" placeholder="Destino (opcional)" />
                <input className="period-select" name="rate" type="number" step="0.0001" min="0.0001" placeholder="Valor/tarifa" required />
                <input className="period-select" name="validFrom" type="date" required />
                <button className="primary-button" disabled={pending || role === 'accountant'}>Adicionar regra de faturamento</button>
              </form>
              <form className="grid gap-3" onSubmit={event => run(event, () => createExpenseCategory({ name: (event.currentTarget.elements.namedItem('categoryName') as HTMLInputElement).value, scope: (event.currentTarget.elements.namedItem('categoryScope') as HTMLSelectElement).value as 'company' | 'truck' | 'operation' }))}>
                <input className="period-select" name="categoryName" placeholder="Categoria de custo" required />
                <select className="period-select" name="categoryScope"><option value="company">Empresa</option><option value="truck">Caminhão</option><option value="operation">Operação</option></select>
                <button className="primary-button" disabled={pending || role === 'accountant'}>Adicionar categoria</button>
              </form>
            </div>
          </section>
          {role === 'admin' && data.managedUsers && <section className="panel lg:col-span-2">
            <h3 className="panel-title">Usuários e permissões</h3>
            <p className="panel-subtitle">A alteração de perfil é validada no servidor.</p>
            <div className="table-scroll mt-4"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th></th></tr></thead><tbody>{data.managedUsers.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.email}</td><td>{item.role}</td><td><select className="period-select" value={item.role} disabled={pending} onChange={event => changeUserRole(item.id, event.target.value as 'admin' | 'accountant' | 'driver')}><option value="admin">Administrador</option><option value="accountant">Contador</option><option value="driver">Funcionário</option></select></td></tr>)}</tbody></table></div>
          </section>}
          <section className="panel">
            <h3 className="panel-title">Benchmark operacional/técnico</h3>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={event => run(event, () => createBenchmark({ truckId: Number(truckId), metric: (event.currentTarget.elements.namedItem('metric') as HTMLInputElement).value, source: (event.currentTarget.elements.namedItem('source') as HTMLSelectElement).value as 'technical' | 'operational', targetValue: Number((event.currentTarget.elements.namedItem('target') as HTMLInputElement).value), validFrom: (event.currentTarget.elements.namedItem('validFrom') as HTMLInputElement).value }))}>
              <input className="period-select" name="metric" placeholder="Indicador (ex.: km_l)" required />
              <select className="period-select" name="source"><option value="operational">Histórico operacional</option><option value="technical">Referência técnica</option></select>
              <input className="period-select" name="target" type="number" step="0.001" placeholder="Valor de referência" required />
              <input className="period-select" name="validFrom" type="date" required />
              <button className="primary-button" disabled={pending || role === 'accountant'}>Adicionar benchmark</button>
            </form>
            <div className="table-scroll mt-4"><table><tbody>{data.benchmarks.map(item => <tr key={item.id}><td>{item.metric}</td><td>{item.source === 'operational' ? 'Operacional' : 'Técnico'}</td><td>{item.targetValue}</td></tr>)}</tbody></table></div>
          </section>
          <section className="panel">
            <h3 className="panel-title">Ocorrências / problemas</h3>
            <form className="mt-4 grid gap-3" onSubmit={event => run(event, () => createIncident({ truckId: Number(truckId), driverId: Number(driverId), category: (event.currentTarget.elements.namedItem('incidentCategory') as HTMLInputElement).value, description: (event.currentTarget.elements.namedItem('incidentDescription') as HTMLTextAreaElement).value }))}>
              <div className="flex gap-2"><select className="period-select flex-1" value={truckId} onChange={event => setTruckId(event.target.value)}>{fleet.map(truck => <option key={truck.id} value={truck.id}>{truck.code} · {truck.plate}</option>)}</select><select className="period-select flex-1" value={driverId} onChange={event => setDriverId(event.target.value)}>{team.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></div>
              <input className="period-select" name="incidentCategory" placeholder="Categoria" required />
              <textarea className="period-select" name="incidentDescription" placeholder="Descreva o ocorrido" required />
              <button className="primary-button" disabled={pending || role === 'accountant'}>Registrar ocorrência</button>
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
              <button className="primary-button" disabled={pending || role === 'accountant'}>Configurar limite</button>
            </form>
            <div className="mt-4 text-xs text-muted-foreground">{data.alertRules.length} regra(s) configurada(s).</div>
          </section>
        </div>
      </div>
    </main>
  )
}
