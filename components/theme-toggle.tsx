'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem('canalog-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const nextDark = saved ? saved === 'dark' : prefersDark
    document.documentElement.classList.toggle('dark', nextDark)
    setDark(nextDark)
  }, [])

  function toggle() {
    const nextDark = !dark
    document.documentElement.classList.toggle('dark', nextDark)
    window.localStorage.setItem('canalog-theme', nextDark ? 'dark' : 'light')
    setDark(nextDark)
  }

  return <button className="theme-toggle" onClick={toggle} aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'} title={dark ? 'Tema claro' : 'Tema escuro'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
}
