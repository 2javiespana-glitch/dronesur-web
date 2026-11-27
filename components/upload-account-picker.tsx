'use client'

import { useEffect, useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { configuredAccounts } from '@/lib/cloudinary'
import type { AccountUsage } from '@/lib/cloudinary-usage'
import { useDialogFocus } from '@/lib/use-dialog-focus'

// Ventana que sale al subir vídeos cuando en «Subir a:» tienes marcado «Elegir en cada vídeo».
// Para cada vídeo eliges la cuenta de Cloudinary a la que va (o «Automático»). Si cancelas, no se sube nada.
//
// Se usa así (ver components/media-manager.tsx):
//   · se monta <UploadAccountPicker password=... /> una vez, en el gestor de archivos;
//   · antes de subir, se llama a `await chooseVideoAccounts(videos)`, que abre la ventana y devuelve la cuenta
//     de cada vídeo (por su posición en la lista que se le pasa) o null si cancelas.

type Choice = Record<number, string>
type Request = { files: { name: string; mb: number }[]; resolve: (choice: Choice | null) => void }

let pending: Request | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

export function chooseVideoAccounts(files: File[]): Promise<Choice | null> {
  pending?.resolve(null) // por si hubiera otra ventana abierta
  return new Promise((resolve) => {
    pending = { files: files.map((f) => ({ name: f.name, mb: f.size / (1024 * 1024) })), resolve }
    notify()
  })
}

export function UploadAccountPicker({ password }: { password: string }) {
  const [request, setRequest] = useState<Request | null>(null)

  useEffect(() => {
    const sync = () => setRequest(pending)
    listeners.add(sync)
    sync()
    return () => {
      listeners.delete(sync)
    }
  }, [])

  if (!request) return null
  const close = (choice: Choice | null) => {
    pending = null
    notify()
    request.resolve(choice)
  }
  return <PickerDialog request={request} password={password} onClose={close} />
}

function PickerDialog({
  request,
  password,
  onClose,
}: {
  request: Request
  password: string
  onClose: (choice: Choice | null) => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogFocus(true, dialogRef)
  const accounts = configuredAccounts()
  const [choices, setChoices] = useState<string[]>(() => request.files.map(() => 'auto'))
  const [usage, setUsage] = useState<AccountUsage[] | null>(null)

  // Los créditos gastados de cada cuenta ayudan a decidir. Si no se pueden leer, la ventana funciona igual.
  useEffect(() => {
    let cancelled = false
    fetch('/api/cloudinary-usage', { cache: 'no-store', headers: { 'x-admin-password': password } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json && Array.isArray(json.accounts)) setUsage(json.accounts as AccountUsage[])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [password])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const optionLabel = (a: (typeof accounts)[number]) => {
    const pct = usage?.find((u) => u.number === a.index + 1)?.percent
    const label = a.account.label ? ` · ${a.account.label}` : ''
    return `Cloudinary ${a.index + 1}${label}${typeof pct === 'number' ? ` · ${pct}% de créditos` : ''}`
  }

  const setOne = (i: number, value: string) => setChoices((prev) => prev.map((c, k) => (k === i ? value : c)))
  const submit = () => {
    const result: Choice = {}
    choices.forEach((value, i) => {
      result[i] = value
    })
    onClose(result)
  }

  const selectClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]'
  const n = request.files.length

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => onClose(null)} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Elegir la cuenta de Cloudinary de cada vídeo"
        className="relative z-10 max-h-[calc(100svh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-[var(--gold)]" />
          <h3 className="text-lg font-bold">¿A qué cuenta va {n > 1 ? 'cada vídeo' : 'el vídeo'}?</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Si la cuenta que elijas está llena, el vídeo pasa solo a otra. «Automático» usa la primera con sitio.
        </p>

        {n > 1 && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium" htmlFor="pick-all">
              La misma cuenta para todos
            </label>
            <select
              id="pick-all"
              className={selectClass}
              value=""
              onChange={(e) => e.target.value && setChoices(request.files.map(() => e.target.value))}
            >
              <option value="">— elegir para todos —</option>
              <option value="auto">Automático</option>
              {accounts.map((a) => (
                <option key={a.account.cloudName} value={a.account.cloudName}>
                  {optionLabel(a)}
                </option>
              ))}
            </select>
          </div>
        )}

        <ul className="mt-4 space-y-3">
          {request.files.map((f, i) => (
            <li key={i}>
              <label className="mb-1 block truncate text-sm font-medium" htmlFor={`pick-${i}`}>
                {f.name} <span className="font-normal text-muted-foreground">· {f.mb.toFixed(f.mb < 10 ? 1 : 0)} MB</span>
              </label>
              <select
                id={`pick-${i}`}
                className={selectClass}
                value={choices[i]}
                onChange={(e) => setOne(i, e.target.value)}
              >
                <option value="auto">Automático</option>
                {accounts.map((a) => (
                  <option key={a.account.cloudName} value={a.account.cloudName}>
                    {optionLabel(a)}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose(null)}
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
          >
            Subir {n > 1 ? `${n} vídeos` : 'vídeo'}
          </button>
        </div>
      </div>
    </div>
  )
}
