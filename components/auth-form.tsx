'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const result = mode === 'sign-up'
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password })
      if (result.error) {
        const detail = result.error.message || ''
        const databaseUnavailable = /timeout|connect|database|query|server_error/i.test(detail)
        setError(databaseUnavailable
          ? 'O banco Railway não respondeu a tempo. Confirme se o serviço está ativo e tente novamente em alguns segundos.'
          : mode === 'sign-up' ? 'Não foi possível criar a conta. Verifique os dados e tente novamente.' : detail || 'E-mail ou senha inválidos.')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente em alguns instantes.')
    } finally {
      setPending(false)
    }
  }
  return <main className="auth-page"><div className="auth-card"><div className="brand-mark">TL</div><p className="eyebrow text-primary">CanaLog</p><h1>{mode === 'sign-up' ? 'Crie sua conta' : 'Acesse sua operação'}</h1><p className="auth-description">{mode === 'sign-up' ? 'Cadastre a conta principal da sua transportadora. Os demais perfis devem ser criados pelo administrador.' : 'Entre para acompanhar produção, custos e registros.'}</p><form onSubmit={submit} className="auth-form">{mode === 'sign-up' && <label>Nome<input required value={name} onChange={e => setName(e.target.value)} placeholder="Antônio Ferreira" /></label>}<label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com" /></label><label>Senha<input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button auth-submit" disabled={pending}>{pending ? 'Entrando...' : mode === 'sign-up' ? 'Criar conta' : 'Entrar'}</button></form><a className="auth-link" href={mode === 'sign-up' ? '/sign-in' : '/sign-up'}>{mode === 'sign-up' ? 'Já tenho uma conta' : 'Criar a primeira conta'}</a></div></main>
}
