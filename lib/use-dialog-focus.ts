'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),select:not([disabled]),input:not([disabled]):not([tabindex="-1"]),[tabindex]:not([tabindex="-1"])'

// Gestiona el foco del teclado dentro de una ventana emergente (formulario, panel...):
//  - al abrirla, el foco entra en la ventana;
//  - con Tab / Shift+Tab el foco no se escapa a la página de detrás;
//  - al cerrarla, el foco vuelve al botón que la abrió.
// No cambia nada de aspecto: solo ayuda a quien navega con teclado o con lector de pantalla.
export function useDialogFocus(active: boolean, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return
    const root = ref.current
    if (!root) return

    const previous = document.activeElement as HTMLElement | null
    const items = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )

    const first = items()[0]
    if (first) {
      first.focus()
    } else {
      root.setAttribute('tabindex', '-1')
      root.focus()
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = items()
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      const current = document.activeElement
      if (e.shiftKey && (current === firstEl || !root.contains(current))) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && (current === lastEl || !root.contains(current))) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [active, ref])
}
