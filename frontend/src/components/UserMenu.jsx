import { useEffect, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'
import { iniciales } from '../format.js'

export default function UserMenu({ usuario, onLogout }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  // Se cierra al tocar fuera o con Escape
  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => {
      if (!ref.current?.contains(e.target)) setAbierto(false)
    }
    const tecla = (e) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  return (
    <div className="menu-usuario" ref={ref}>
      <button
        className="avatar-redondo"
        aria-label="Menú de perfil"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
      >
        {iniciales(usuario.nombre)}
      </button>

      {abierto && (
        <div className="menu-usuario-panel" role="menu">
          <div className="menu-usuario-cabecera">
            <span className="avatar-redondo">{iniciales(usuario.nombre)}</span>
            <span className="fila-texto">
              <strong>{usuario.nombre}</strong>
              <small>{usuario.correo}</small>
            </span>
          </div>
          <button role="menuitem" className="menu-usuario-salir" onClick={onLogout}>
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}