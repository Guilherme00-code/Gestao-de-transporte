'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter(); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); setPending(true); setError(''); const result = mode === 'sign-in' ? await authClient.signIn.email({ email, password }) : await authClient.signUp.email({ name, email, password }); if (result.error) setError('Não foi possível concluir o acesso. Verifique os dados informados.'); else { router.push('/'); router.refresh() }; setPending(false) }
  return <form className="auth-card" onSubmit={submit}><div className="auth-mark">CL</div><p className="eyebrow">CANALOG · GESTÃO OPERACIONAL</p><h1>{mode === 'sign-in' ? 'Acesse seu painel' : 'Crie seu acesso'}</h1><p className="muted">{mode === 'sign-in' ? 'Entre para acompanhar a operação da safra.' : 'Cadastre o primeiro usuário administrador.'}</p>{mode === 'sign-up' && <label>Nome completo<input value={name} onChange={(event) => setName(event.target.value)} required /></label>}<label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Senha<input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="auth-error">{error}</p>}<button className="primary-action auth-submit" disabled={pending}>{pending ? 'Aguarde...' : mode === 'sign-in' ? 'Entrar no sistema' : 'Criar acesso'}</button><a className="auth-switch" href={mode === 'sign-in' ? '/sign-up' : '/sign-in'}>{mode === 'sign-in' ? 'Ainda não tenho acesso' : 'Já tenho uma conta'}</a></form>
}
