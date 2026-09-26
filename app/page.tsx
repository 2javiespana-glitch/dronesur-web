"use client"

import React, { useState, useEffect } from "react"

export default function Page() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminToken, setAdminToken] = useState("")
  const [loginInput, setLoginInput] = useState("")
  const [activeTab, setActiveTab] = useState("inicio")

  // Comprobar si ya existe token en localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("dronesur_admin_token")
    if (savedToken === "poyete_dronesur") {
      setIsAdmin(true)
      setAdminToken(savedToken)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (loginInput === "poyete_dronesur") {
      localStorage.setItem("dronesur_admin_token", "poyete_dronesur")
      setIsAdmin(true)
      setAdminToken("poyete_dronesur")
      alert("Acceso concedido al panel de administración.")
    } else {
      alert("Contraseña incorrecta.")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("dronesur_admin_token")
    setIsAdmin(false)
    setAdminToken("")
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navegación Principal */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <span className="text-xl font-bold text-[#D4AF37]">DRONESUR</span>
            <p className="text-xs text-gray-400">Perspectivas Aéreas</p>
          </div>
          <div className="hidden items-center gap-6 text-sm text-gray-300 md:flex">
            <a href="#inicio" className="transition-colors hover:text-[#D4AF37]">Inicio</a>
            <a href="#promociones" className="transition-colors hover:text-[#D4AF37]">Promociones</a>
            <a href="#servicios" className="transition-colors hover:text-[#D4AF37]">Servicios</a>
            <a href="#garantia" className="transition-colors hover:text-[#D4AF37]">Garantía Legal</a>
            <a href="#resenas" className="transition-colors hover:text-[#D4AF37]">Reseñas</a>
            <a href="#sobre-nosotros" className="transition-colors hover:text-[#D4AF37]">Sobre Nosotros</a>
            <a href="#contacto" className="transition-colors hover:text-[#D4AF37]">Contacto</a>
            <a href="#cookies" className="transition-colors hover:text-[#D4AF37]">Cookies</a>
          </div>
          <a
            href="https://wa.me/34644424448?utm_source=gemini"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#D4AF37] px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Presupuesto
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <section
        id="inicio"
        className="flex flex-col items-center justify-center bg-gradient-to-b from-black to-gray-900 px-6 py-32 text-center"
      >
        <h1 className="max-w-3xl text-4xl font-bold md:text-6xl">
          Elevamos la imagen de tu proyecto
        </h1>
        <p className="mt-6 max-w-xl text-gray-400">
          Perspectivas aéreas de alto impacto en el sur de España. Grabación
          profesional en 4K, inspecciones y fotografía audiovisual con drones.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <a
            href="https://wa.me/34644424448?utm_source=gemini"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-[#D4AF37] px-6 py-3 font-semibold text-black transition-opacity hover:opacity-90"
          >
            Pide tu presupuesto
          </a>
          <a
            href="tel:+34644424448"
            className="rounded-xl border border-gray-600 px-6 py-3 font-semibold text-white transition-colors hover:border-[#D4AF37]"
          >
            Llamar: +34 644 42 44 48
          </a>
        </div>
      </section>

      {/* Sección de Servicios */}
      <section id="servicios" className="bg-gray-950 px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Nuestros Servicios</h2>
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-black p-8">
            <h3 className="mb-3 text-xl font-semibold text-[#D4AF37]">Vídeo Audiovisual 4K</h3>
            <p className="text-sm text-gray-400">
              Producciones cinematográficas para eventos, inmobiliaria, turismo y publicidad.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-black p-8">
            <h3 className="mb-3 text-xl font-semibold text-[#D4AF37]">Fotografía Aérea</h3>
            <p className="text-sm text-gray-400">
              Capturas de alta resolución para arquitectura, terrenos y promociones.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-black p-8">
            <h3 className="mb-3 text-xl font-semibold text-[#D4AF37]">Inspecciones Técnicas</h3>
            <p className="text-sm text-gray-400">
              Revisiones seguras en cubiertas, estructuras e infraestructuras de difícil acceso.
            </p>
          </div>
        </div>
      </section>

      {/* Panel de Administración */}
      <section className="border-t border-gray-800 bg-black px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-2 text-2xl font-bold">Panel de Administración</h2>
          <p className="mb-8 text-sm text-gray-500">
            Acceso restringido para la gestión interna de Dronesur
          </p>

          {!isAdmin ? (
            <form onSubmit={handleLogin} className="text-left">
              <label className="mb-2 block text-sm text-gray-400">
                Clave de Administración
              </label>
              <input
                type="password"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="Introduce tu contraseña"
                className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white focus:border-[#D4AF37] focus:outline-none"
              />
              <button
                type="submit"
                className="mt-4 w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black transition-opacity hover:opacity-90"
              >
                Acceder al Panel
              </button>
            </form>
          ) : (
            <div>
              <p className="mb-4 text-sm text-green-400">
                ✓ Sesión iniciada como Administrador
              </p>
              <button
                onClick={handleLogout}
                className="mb-6 rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:border-[#D4AF37] hover:text-white"
              >
                Cerrar Sesión
              </button>

              <div className="mb-6 flex flex-wrap justify-center gap-2">
                {["Multimedia", "Precios", "Piloto", "Ajustes"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase())}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                      activeTab === tab.toLowerCase()
                        ? "bg-[#D4AF37] text-black"
                        : "bg-gray-900 text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-950 p-6 text-sm text-gray-400">
                Sección {activeTab.toUpperCase()} lista para editar. Cambios guardados localmente.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer / Pie de Página */}
      <footer className="border-t border-gray-800 bg-gray-950 px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 text-sm md:grid-cols-3">
          <div>
            <h3 className="mb-2 text-lg font-bold text-[#D4AF37]">Dronesur</h3>
            <p className="text-gray-400">
              Perspectivas aéreas profesionales. Operador certificado.
            </p>
          </div>
          <div>
            <h4 className="mb-2 font-semibold">Contacto Directo</h4>
            <p className="text-gray-400">Teléfono: +34 644 42 44 48</p>
            <a
              href="https://wa.me/34644424448?utm_source=gemini"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4AF37] hover:underline"
            >
              WhatsApp: +34 644 42 44 48
            </a>
          </div>
          <div>
            <h4 className="mb-2 font-semibold">Síguenos</h4>
            <a
              href="https://instagram.com/dronesur"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 transition-colors hover:text-[#D4AF37]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              @dronesur
            </a>
          </div>
        </div>
        <p className="mt-8 border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Dronesur. Todos los derechos reservados.
        </p>
      </footer>
    </main>
  )
}
