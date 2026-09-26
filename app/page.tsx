t"

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
{/* Navegación Principal */}

DRONESUR

Perspectivas Aéreas

Inicio
Promociones
Servicios
Garantía Legal
Reseñas
Sobre Nosotros
Contacto
Cookies


Presupuesto

{/* Hero Section */}

Elevamos la imagen de tu proyecto
Perspectivas aéreas de alto impacto en el sur de España. Grabación profesional en 4K, inspecciones y fotografía audiovisual con drones.


Pide tu presupuesto


Llamar: +34 644 42 44 48

{/* Sección de Servicios */}

Nuestros Servicios
Vídeo Audiovisual 4K
Producciones cinematográficas para eventos, inmobiliaria, turismo y publicidad.

Fotografía Aérea
Capturas de alta resolución para arquitectura, terrenos y promociones.

Inspecciones Técnicas
Revisiones seguras en cubiertas, estructuras e infraestructuras de difícil acceso.

{/* Panel de Administración / Admin */}

Panel de Administración
Acceso restringido para la gestión interna de Dronesur

{!isAdmin ? (

Clave de Administración
setLoginInput(e.target.value)}
placeholder="Introduce tu contraseña"
className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
/>

Acceder al Panel

) : (

✓ Sesión iniciada como Administrador

Cerrar Sesión

{["Multimedia", "Precios", "Piloto", "Ajustes"].map((tab) => (
setActiveTab(tab.toLowerCase())}
className={py-2 px-4 rounded-xl text-sm font-semibold transition-all ${ activeTab === tab.toLowerCase() ? "bg-[#D4AF37] text-black" : "bg-gray-900 text-gray-300 hover:bg-gray-800" }}

{tab}
))}

Sección {activeTab.toUpperCase()} lista para editar. Cambios guardados localmente.

)}

{/* Footer / Pie de Página */}

Dronesur
Perspectivas Aéreas profesionales. Operador certificado.

Contacto Directo
Teléfono: +34 644 42 44 48

WhatsApp: +34 644 42 44 48

Síguenos
[

SVG

@dronesur
](https://instagram.com/dronesur)

© {new Date().getFullYear()} Dronesur. Todos los derechos reservados.

)
}
