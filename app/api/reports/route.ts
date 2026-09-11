import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { listOperations } from '@/app/actions/operations'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ success: false, data: null, message: 'Não autorizado' }, { status: 401 })
  }
  try {
    const data = await listOperations()
    return NextResponse.json({ success: true, data, message: 'Relatório carregado com sucesso.' })
  } catch (error) {
    return NextResponse.json({ success: false, data: null, message: error instanceof Error ? error.message : 'Não foi possível carregar o relatório' }, { status: 500 })
  }
}
