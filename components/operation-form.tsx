'use client'

import { FormEvent, useState } from 'react'
import { createOperation } from '@/app/actions/operations'

export default function OperationForm() {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      await createOperation({
        operationDate: String(form.get('operationDate')),
        truckCode: String(form.get('truckCode')),
        driverName: String(form.get('driverName')),
        city: String(form.get('city')),
        km: Number(form.get('km')),
        tons: Number(form.get('tons')),
        liters: Number(form.get('liters')),
      })
      event.currentTarget.reset()
      setMessage('Operação salva com sucesso.')
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
  </form>
}