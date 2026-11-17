'use client'

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { panoramaUrl } from '@/lib/media-url'
import {
  FRAGMENT_SHADER,
  PROJECTIONS,
  VERTEX_SHADER,
  type ProjectionMode,
} from '@/lib/panorama-projections'

// Visor de fotos 360° con proyecciones distintas a la clásica: planeta, invertido, ojo de pez,
// globo y plano. No usa librerías: dibuja la foto con un shader de WebGL2.

const AUTO_SPEED = 0.09 // radianes por segundo del giro automático (unos 5°/s)
const MAX_FLING = 6 // velocidad máxima del "empujón" al soltar (rad/s)

export type ProjectionViewerHandle = {
  /** Devuelve la vista al estado inicial del modo actual. */
  reset: () => void
  /** Imagen PNG de lo que se ve ahora mismo. */
  capture: () => Promise<Blob | null>
}

/** ¿Puede este navegador dibujar las proyecciones? (necesita WebGL2) */
export function supportsProjections(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function buildProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!vs || !fs || !program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

type EngineHooks = {
  onInteract?: () => void
  onError: () => void
}

function createEngine(canvas: HTMLCanvasElement, hooks: EngineHooks) {
  let context: WebGL2RenderingContext | null = null
  try {
    context = canvas.getContext('webgl2', { antialias: false, alpha: false })
  } catch {
    context = null
  }
  if (!context) return null
  const gl = context
  const program = buildProgram(gl)
  if (!program) return null

  gl.useProgram(program)
  const uniform = {
    tex: gl.getUniformLocation(program, 'uTex'),
    res: gl.getUniformLocation(program, 'uRes'),
    mode: gl.getUniformLocation(program, 'uMode'),
    yaw: gl.getUniformLocation(program, 'uYaw'),
    pitch: gl.getUniformLocation(program, 'uPitch'),
    zoom: gl.getUniformLocation(program, 'uZoom'),
  }
  gl.uniform1i(uniform.tex, 0)

  // ---------- Estado de la vista ----------
  const view = { yaw: 0, pitch: 0, zoom: 1 }
  let mode: ProjectionMode = 'globe'
  let auto = false
  let texture: WebGLTexture | null = null
  let dragging = false
  let vYaw = 0
  let vPitch = 0
  let raf = 0
  let last = 0

  const constrain = () => {
    const cfg = PROJECTIONS[mode]
    view.zoom = clamp(view.zoom, cfg.zoom.min, cfg.zoom.max)
    const maxPitch = mode === 'flat' ? (Math.PI / 2) * (1 - 1 / view.zoom) : cfg.maxPitch
    view.pitch = clamp(view.pitch, -maxPitch, maxPitch)
    view.yaw = ((((view.yaw + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI
  }

  // ---------- Dibujo ----------
  const draw = () => {
    if (canvas.width === 0 || canvas.height === 0) return
    gl.viewport(0, 0, canvas.width, canvas.height)
    if (!texture) {
      gl.clearColor(0.03, 0.04, 0.05, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      return
    }
    gl.uniform2f(uniform.res, canvas.width, canvas.height)
    gl.uniform1i(uniform.mode, PROJECTIONS[mode].id)
    gl.uniform1f(uniform.yaw, view.yaw)
    gl.uniform1f(uniform.pitch, view.pitch)
    gl.uniform1f(uniform.zoom, view.zoom)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  // Solo se dibuja cuando hace falta: al tocar la vista, con el giro automático o mientras dura el empujón.
  const tick = (now: number) => {
    raf = 0
    const dt = clamp((now - last) / 1000, 0, 0.05)
    last = now
    let animating = false
    if (!dragging) {
      if (Math.abs(vYaw) > 0.01 || Math.abs(vPitch) > 0.01) {
        view.yaw += vYaw * dt
        view.pitch += vPitch * dt
        const decay = Math.exp(-dt * 3.5)
        vYaw *= decay
        vPitch *= decay
        animating = true
      } else {
        vYaw = 0
        vPitch = 0
      }
      if (auto) {
        view.yaw += AUTO_SPEED * dt
        animating = true
      }
    }
    constrain()
    draw()
    if (animating) raf = requestAnimationFrame(tick)
  }

  const request = () => {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  // ---------- Tamaño ----------
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    request()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  // ---------- Entrada: ratón, dedo, rueda y teclado ----------
  // Cuántos radianes gira la vista por cada píxel que se arrastra (para que el dedo "agarre" la imagen).
  const radPerPx = () => {
    const m = Math.min(canvas.clientWidth, canvas.clientHeight) || 1
    const h = canvas.clientHeight || 1
    switch (mode) {
      case 'globe':
        return 1 / (0.85 * view.zoom * 0.5 * m)
      case 'fisheye':
        return 1.75 / (view.zoom * 0.5 * m)
      case 'flat':
        return Math.PI / (h * view.zoom)
      default:
        return 2.4 / (view.zoom * m)
    }
  }

  const pointers = new Map<number, { x: number; y: number }>()
  let pinchDist = 0
  let pinchZoom = 1
  let lastMoveTime = 0

  const pinchDistance = () => {
    const [a, b] = [...pointers.values()]
    return Math.hypot(a.x - b.x, a.y - b.y) || 1
  }

  const onPointerDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId)
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size === 1) {
      dragging = true
      vYaw = 0
      vPitch = 0
    } else if (pointers.size === 2) {
      pinchDist = pinchDistance()
      pinchZoom = view.zoom
    }
    hooks.onInteract?.()
  }

  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.get(e.pointerId)
    if (!prev) return
    const cur = { x: e.clientX, y: e.clientY }
    if (pointers.size === 1) {
      const k = radPerPx()
      const dYaw = -(cur.x - prev.x) * k
      const dPitch = (cur.y - prev.y) * k
      view.yaw += dYaw
      view.pitch += dPitch
      const dt = Math.max(1, e.timeStamp - lastMoveTime) / 1000
      vYaw = clamp(dYaw / dt, -MAX_FLING, MAX_FLING) * 0.5 + vYaw * 0.5
      vPitch = clamp(dPitch / dt, -MAX_FLING, MAX_FLING) * 0.5 + vPitch * 0.5
      lastMoveTime = e.timeStamp
    }
    pointers.set(e.pointerId, cur)
    if (pointers.size === 2) view.zoom = pinchZoom * (pinchDistance() / pinchDist)
    constrain()
    request()
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    if (pointers.size === 0) {
      dragging = false
      // Si se soltó parado, no hay empujón.
      if (e.timeStamp - lastMoveTime > 80) {
        vYaw = 0
        vPitch = 0
      }
      request()
    } else if (pointers.size === 1) {
      vYaw = 0
      vPitch = 0
    }
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    view.zoom *= Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.03 : 0.0015))
    constrain()
    request()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const step = 0.12 / view.zoom
    switch (e.key) {
      case 'ArrowLeft':
        view.yaw -= step
        break
      case 'ArrowRight':
        view.yaw += step
        break
      case 'ArrowUp':
        view.pitch += step
        break
      case 'ArrowDown':
        view.pitch -= step
        break
      case '+':
      case '=':
        view.zoom *= 1.15
        break
      case '-':
        view.zoom /= 1.15
        break
      case '0':
        reset()
        return
      default:
        return
    }
    e.preventDefault()
    hooks.onInteract?.()
    constrain()
    request()
  }

  const onContextLost = (e: Event) => {
    e.preventDefault()
    hooks.onError()
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('keydown', onKeyDown)
  const onDoubleClick = () => reset()
  canvas.addEventListener('dblclick', onDoubleClick)
  canvas.addEventListener('webglcontextlost', onContextLost)

  // ---------- API ----------
  function reset() {
    const cfg = PROJECTIONS[mode]
    view.pitch = cfg.pitch
    view.zoom = cfg.zoom.def
    vYaw = 0
    vPitch = 0
    constrain()
    request()
  }

  function setMode(next: ProjectionMode) {
    mode = next
    reset()
  }

  function setAuto(value: boolean) {
    auto = value
    request()
  }

  // Sube la foto a la tarjeta gráfica (reduciéndola si el móvil no admite texturas tan grandes).
  function setImage(img: HTMLImageElement) {
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    let source: TexImageSource = img
    const biggest = Math.max(img.naturalWidth, img.naturalHeight)
    if (biggest > max) {
      const scale = max / biggest
      const small = document.createElement('canvas')
      small.width = Math.floor(img.naturalWidth * scale)
      small.height = Math.floor(img.naturalHeight * scale)
      small.getContext('2d')?.drawImage(img, 0, 0, small.width, small.height)
      source = small
    }
    const tex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic')
    if (aniso) {
      const maxAniso = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAniso))
    }
    if (texture) gl.deleteTexture(texture)
    texture = tex
    request()
  }

  function capture(): Promise<Blob | null> {
    draw() // hay que dibujar justo antes: el lienzo no conserva el fotograma anterior
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
  }

  function destroy() {
    cancelAnimationFrame(raf)
    observer.disconnect()
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('keydown', onKeyDown)
    canvas.removeEventListener('dblclick', onDoubleClick)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    if (texture) gl.deleteTexture(texture)
    gl.deleteProgram(program)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  resize()
  return { setMode, setAuto, setImage, reset, capture, destroy }
}

type Engine = NonNullable<ReturnType<typeof createEngine>>

type Props = {
  url: string
  mode: ProjectionMode
  autoRotate: boolean
  /** Texto accesible del visor y mensaje de carga (ya traducidos). */
  label: string
  loadingLabel: string
  onUserInteract?: () => void
  /** Se avisa si no hay WebGL2, la foto no carga o se pierde el contexto gráfico. */
  onError: () => void
  ref?: Ref<ProjectionViewerHandle>
}

export function PanoramaProjectionViewer({
  url,
  mode,
  autoRotate,
  label,
  loadingLabel,
  onUserInteract,
  onError,
  ref,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const hooksRef = useRef({ onUserInteract, onError })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    hooksRef.current = { onUserInteract, onError }
  })

  useImperativeHandle(
    ref,
    () => ({
      reset: () => engineRef.current?.reset(),
      capture: () => engineRef.current?.capture() ?? Promise.resolve(null),
    }),
    [],
  )

  // El orden de estos efectos importa: primero se crea el motor y después se le dan modo, giro y foto.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = createEngine(canvas, {
      onInteract: () => hooksRef.current.onUserInteract?.(),
      onError: () => hooksRef.current.onError(),
    })
    if (!engine) {
      hooksRef.current.onError()
      return
    }
    engineRef.current = engine
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setMode(mode)
  }, [mode])

  useEffect(() => {
    engineRef.current?.setAuto(autoRotate)
  }, [autoRotate])

  useEffect(() => {
    let cancelled = false
    setReady(false)
    const img = new Image()
    img.crossOrigin = 'anonymous' // necesario para poder usar la foto como textura
    img.onload = () => {
      if (cancelled) return
      try {
        engineRef.current?.setImage(img)
        setReady(true)
      } catch {
        hooksRef.current.onError()
      }
    }
    img.onerror = () => {
      if (!cancelled) hooksRef.current.onError()
    }
    img.src = panoramaUrl(url)
    return () => {
      cancelled = true
      img.onload = null
      img.onerror = null
    }
  }, [url])

  return (
    <div className="relative h-full w-full bg-black">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={label}
        className="block h-full w-full cursor-grab touch-none outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
      />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/70">
          {loadingLabel}
        </div>
      )}
    </div>
  )
}
