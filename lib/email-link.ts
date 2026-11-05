// Abre el correo de forma que funcione en cualquier dispositivo.
// - En móvil: abre la app de correo del teléfono (mailto:).
// - En ordenador: abre Gmail en una pestaña nueva con el mensaje ya escrito, porque muchos
//   ordenadores no tienen ningún programa de correo configurado y "mailto:" no hace nada.
export function openEmail(to: string, subject = '', body = '') {
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (isMobile) {
    window.location.href = mailto
    return
  }
  const gmail =
    'https://mail.google.com/mail/?view=cm&fs=1' +
    `&to=${encodeURIComponent(to)}` +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`
  window.open(gmail, '_blank', 'noopener,noreferrer')
}
