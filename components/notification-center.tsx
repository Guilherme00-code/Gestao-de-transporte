'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { listUnreadNotifications, markNotificationRead } from '@/app/actions/advanced'

type Notice = { id: number; title: string; message: string }

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notice[]>([])
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (!next) return
    setLoading(true)
    try { setItems(await listUnreadNotifications()) } finally { setLoading(false) }
  }
  async function read(id: number) {
    await markNotificationRead(id)
    setItems(current => current.filter(item => item.id !== id))
  }

  return <div className="notification-menu"><button type="button" className="notification" onClick={toggle} aria-label="Notificações" aria-expanded={open}><Bell size={18} />{items.length > 0 && <i />}</button>{open && <div className="notification-popover"><strong>Notificações</strong>{loading ? <p>Carregando...</p> : items.length ? items.map(item => <button type="button" key={item.id} onClick={() => read(item.id)}><b>{item.title}</b><span>{item.message}</span></button>) : <p>Você não tem notificações novas.</p>}</div>}</div>
}
