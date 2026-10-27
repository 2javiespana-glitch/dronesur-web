// DATOS DEL TITULAR DE LA WEB: rellénalos UNA SOLA VEZ aquí.
// Se usan en el Aviso legal, la Política de privacidad, la Política de cookies y la
// sección «Sobre el piloto».
//
// Sustituye cada texto que empieza por [COMPLETAR] por tu dato real.
// Mientras quede alguno sin completar, las páginas legales muestran un aviso en rojo
// para que no se te olvide (desaparece solo cuando los completes todos).

export const LEGAL = {
  titular: 'Javier Lopez Villena',
  // Como autónomo tu NIF es tu mismo DNI: no cambia el día que te des de alta.
  nif: '75917102J',
  domicilio: 'C/Monaco R 1, 129',
  email: 'dronesur@gmail.com',
  telefono: '+34 644424448',

  // Tu dirección web, sin "https://". Cámbiala cuando tengas dominio propio.
  web: 'dronesur.vercel.app',

  // Solo si eres sociedad. Ejemplo: 'Inscrita en el Registro Mercantil de Almería, Tomo X, Folio Y, Hoja Z'.
  // Si eres autónomo, déjalo vacío: ''
  registroMercantil: '',

  // Tu número de operador de drones en AESA (empieza por ESP...). Si no lo quieres mostrar, déjalo ''.
  operadorAesa: 'ESPgg7k96dmo3jua',

  // Aseguradora o póliza de responsabilidad civil. Déjalo '' mientras NO tengas seguro:
  // así la web no dirá en ningún sitio que estás asegurado. Cuando lo contrates, rellénalo.
  seguroRc: '',

  actividad: 'Servicios profesionales de fotografía y vídeo aéreo con drones',

  // ====== EL INTERRUPTOR PARA CUANDO TE DES DE ALTA ======
  // Mientras trabajes gratis, escribe aquí hasta cuándo (ej. 'enero de 2027').
  // El día que empieces a cobrar, déjalo vacío: '' y los textos legales pasan solos
  // a hablar de tarifas. No hace falta tocar nada más.
  serviciosGratuitosHasta: 'enero de 2027',

  // Se usa cuando ya cobres. Confírmalo con tu gestor: 'IVA incluido' o 'más IVA'.
  ivaPrecios: 'IVA incluido',

  actualizado: 'octubre de 2026',
}

export function hasPlaceholders() {
  return Object.values(LEGAL).some((v) => v.includes('[COMPLETAR'))
}
