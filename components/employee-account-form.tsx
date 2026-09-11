'use client'

import { FormEvent, useState } from 'react'
import { createEmployeeAccount } from '@/app/actions/advanced'

export default function EmployeeAccountForm({ onSaved }: { onSaved?: () => void }) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setPending(true)
    setMessage('')
    try {
      await createEmployeeAccount({
        name: String(form.get('name')),
        email: String(form.get('email')),
        password: String(form.get('password')),
        role: String(form.get('role')) as 'driver' | 'accountant',
        phone: String(form.get('phone') || ''),
        employeeId: String(form.get('employeeId') || ''),
      })
      formElement.reset()
      setMessage('Funcionário cadastrado. Entregue a senha inicial de forma segura; ele poderá trocá-la em Minha conta.')
      onSaved?.()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível criar o acesso.')
    } finally {
      setPending(false)
    }
  }

  return <form className="form-panel" onSubmit={submit}>
    <label>Nome completo<input name="name" minLength={2} required /></label>
    <label>Perfil<select name="role" defaultValue="driver"><option value="driver">Motorista</option><option value="accountant">Contador</option></select></label>
    <label>E-mail de acesso<input name="email" type="email" required /></label>
    <label>Senha inicial<input name="password" type="password" minLength={8} required /></label>
    <label>Telefone<input name="phone" placeholder="Opcional" /></label>
    <label>Matrícula<input name="employeeId" placeholder="Opcional" /></label>
    <button className="primary-action" disabled={pending}>{pending ? 'Criando acesso...' : 'Criar funcionário'}</button>
    {message && <p className="muted">{message}</p>}
  </form>
}
