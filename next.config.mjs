/** @type {import('next').NextConfig} */

// Cabeceras de seguridad para todas las páginas.
const securityHeaders = [
  // El navegador no "adivina" el tipo de un archivo: evita que un archivo subido se ejecute como otra cosa.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Solo se envía el dominio (no la dirección completa) cuando alguien pasa a otra web desde la tuya.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Ninguna otra web puede meter la tuya dentro de un marco (evita el "clickjacking").
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // La web no necesita cámara, micrófono ni ubicación: se bloquean por si algún código las pidiera.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

// Archivos fijos que casi nunca cambian: el navegador los guarda 1 día (y hasta 1 semana mientras
// comprueba si hay versión nueva), en vez de preguntar al servidor en cada visita.
const staticCache = [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }]

const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/logo-dronesur.png', headers: staticCache },
      { source: '/logo-dronesur-large.png', headers: staticCache },
      { source: '/placeholder.svg', headers: staticCache },
    ]
  },
}

export default nextConfig
