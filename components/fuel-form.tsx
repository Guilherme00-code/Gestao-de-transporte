'use client'

import { FormEvent, useState } from 'react'
import { createFuelRecord } from '@/app/actions/operations'

export default function FuelForm({ onSaved }: { onSaved?: () => void }) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setPending(true)
    setMessage('')
    try {
      await createFuelRecord({
        recordDate: String(form.get('recordDate')),
        km: Number(form.get('km')),
        liters: Number(form.get('liters')),
        pricePerLiter: Number(form.get('pricePerLiter') || 0),
        station: String(form.get('station') || ''),
      })
      formElement.reset()
      setMessage('Abastecimento salvo e custo total calculado.')
      onSaved?.()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o abastecimento.')
    } finally {
      setPending(false)
    }
  }

  return <form className="form-panel" onSubmit={submit}>
    <label>Data do abastecimento<input name="recordDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
    <label>Posto<input name="station" placeholder="Nome do posto (opcional)" /></label>
    <label>KM percorridos<input name="km" type="number" min="0" step="0.01" required /></label>
    <label>Litros abastecidos<input name="liters" type="number" min="0.01" step="0.01" required /></label>
    <label>Preço por litro<input name="pricePerLiter" type="number" min="0" step="0.001" placeholder="Opcional" /></label>
    <button className="primary-action" disabled={pending}>{pending ? 'Salvando...' : 'Salvar abastecimento'}</button>
    {message && <p className="muted">{message}</p>}
  </form>
}
