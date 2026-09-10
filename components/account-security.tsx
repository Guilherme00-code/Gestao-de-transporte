'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function AccountSecurity({ initialName }: { initialName: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  async function updateProfile(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setProfileMessage('')
    const result = await authClient.updateUser({ name: name.trim() })
    setProfileMessage(result.error ? (result.error.message || 'Não foi possível atualizar o perfil.') : 'Perfil atualizado com sucesso.')
    setPending(false)
    if (!result.error) router.refresh()
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
    setMessage(result.error ? (result.error.message || 'Não foi possível alterar a senha.') : 'Senha alterada com sucesso.')
    if (!result.error) {
      setCurrentPassword('')
      setNewPassword('')
      router.refresh()
    }
    setPending(false)
  }
  return <div className="grid max-w-xl gap-5"><form className="panel grid gap-3" onSubmit={updateProfile}><h1 className="panel-title">Meu perfil</h1><p className="panel-subtitle">Atualize somente seus dados pessoais. O administrador mantém seu perfil de acesso e vínculo operacional.</p><input required minLength={2} placeholder="Nome completo" value={name} onChange={event => setName(event.target.value)} /><button className="primary-button" disabled={pending}>Salvar perfil</button>{profileMessage && <p className="text-sm text-muted-foreground">{profileMessage}</p>}</form><form className="panel grid gap-3" onSubmit={submit}><h1 className="panel-title">Segurança da conta</h1><p className="panel-subtitle">Altere sua senha e encerre as outras sessões.</p><input required minLength={8} type="password" placeholder="Senha atual" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /><input required minLength={8} type="password" placeholder="Nova senha (mínimo 8 caracteres)" value={newPassword} onChange={event => setNewPassword(event.target.value)} /><button className="primary-button" disabled={pending}>{pending ? 'Salvando...' : 'Alterar senha'}</button>{message && <p className="text-sm text-muted-foreground">{message}</p>}</form></div>
}
