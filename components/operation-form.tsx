'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOperation } from '@/app/actions/operations'

export default function OperationForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmation, setConfirmation] = useState<{ operationDate: string; truckCode: string; driverName: string; city: string; km: number; tons: number; liters: number } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    const form = new FormData(event.currentTarget)
    setConfirmation({
      operationDate: String(form.get('operationDate') ?? ''),
      truckCode: String(form.get('truckCode') ?? ''),
      driverName: String(form.get('driverName') ?? ''),
      city: String(form.get('city') ?? ''),
      km: Number(form.get('km') ?? 0),
      tons: Number(form.get('tons') ?? 0),
      liters: Number(form.get('liters') ?? 0),
    })
  }

  async function confirmSubmit() {
    if (!confirmation) return
    setPending(true)
    try {
      await createOperation({
        operationDate: confirmation.operationDate,
        truckCode: confirmation.truckCode,
        driverName: confirmation.driverName,
        city: confirmation.city,
        km: confirmation.km,
        tons: confirmation.tons,
        liters: confirmation.liters,
      })
      setConfirmation(null)
      setMessage('Operação salva com sucesso.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a operação.')
    } finally {
      setPending(false)
    }
  }

  return <form className="form-panel" onSubmit={submit}>
    <label>Data da operação<input name="operationDate" type="date" required /></label>
    <label>Caminhão<input name="truckCode" placeholder="Código ou placa" required /></label>
    <label>Motorista<input name="driverName" placeholder="Nome do motorista" required /></label>
    <label>Destino<input name="city" placeholder="Usina ou destino" required /></label>
    <label>KM rodados<input name="km" type="number" min="0.01" step="0.01" required /></label>
    <label>Toneladas<input name="tons" type="number" min="0.01" step="0.01" required /></label>
    <label>Litros<input name="liters" type="number" min="0" step="0.01" required /></label>
    <button className="primary-action" disabled={pending}>{pending ? 'Salvando...' : 'Salvar operação'}</button>
    {message && <p className="muted">{message}</p>}
    {confirmation && <div className="modal-backdrop" role="presentation"><div className="confirm-modal" role="dialog" aria-modal="true"><h3>Confirmar operação</h3><p>Deseja salvar esta operação no banco?</p><p className="muted">{confirmation.city} · {confirmation.tons} t · {confirmation.km} km</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setConfirmation(null)} disabled={pending}>Cancelar</button><button type="button" className="primary-action" onClick={confirmSubmit} disabled={pending}>{pending ? 'Salvando...' : 'Confirmar e salvar'}</button></div></div></div>}
  </form>
}