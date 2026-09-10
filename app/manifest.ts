import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CanaLog Gestão de Transporte',
    short_name: 'CanaLog',
    description: 'Gestão operacional, financeira e de frota para transporte de cana-de-açúcar.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f6ee',
    theme_color: '#2e6b4d',
    lang: 'pt-BR',
  }
}
