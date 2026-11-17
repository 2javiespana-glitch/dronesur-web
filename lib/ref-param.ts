// Lee el «?ref=cartel-1» de la dirección y lo QUITA de la barra del navegador, para que el visitante
// vea dronesur.es limpio. El nombre se guarda solo en memoria (una variable de esta pestaña):
// no usa cookies ni almacenamiento del dispositivo, y se pierde al recargar o cerrar la pestaña.
//
// Se guarda porque el recuento de visitas (visit-tracker.tsx) solo arranca si el visitante acepta las
// estadísticas, y puede aceptarlas unos segundos DESPUÉS de entrar. Sin esta copia, para entonces la
// dirección ya estaría limpia y no se sabría de qué cartel viene.
let captured = ''

export function takeRef(): string {
  if (typeof window === 'undefined') return captured
  try {
    const url = new URL(window.location.href)
    const raw = url.searchParams.get('ref')
    if (raw !== null) {
      // Solo letras, números, guion y guion bajo (igual que valida el servidor).
      captured = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30)
      url.searchParams.delete('ref')
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    }
  } catch {
    // Si algo falla, la dirección se queda como está: no se rompe nada.
  }
  return captured
}
