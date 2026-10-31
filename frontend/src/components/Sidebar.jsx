import {
  ChartColumn,
  ChevronRight,
  CircleHelp,
  Ellipsis,
  LayoutGrid,
  Package,
  Receipt,
  Settings,
} from 'lucide-react'
import { iniciales } from '../format.js'

const MENU = [
  { id: 'resumen', texto: 'Resumen', Icono: LayoutGrid },
  { id: 'productos', texto: 'Productos', Icono: Package },
  { id: 'ventas', texto: 'Ventas', Icono: Receipt },
  { id: 'reportes', texto: 'Reportes', Icono: ChartColumn },
]

export default function Sidebar({
  abierto,
  seccion,
  setSeccion,
  tienda,
  perfil,
  totalProductos,
  onTiendas,
  onPerfil,
}) {
  return (
   <aside className={'sidebar' + (abierto ? ' abierto' : '')}>
      <div className="logo">
        <span className="logo-icono">
          <Package size={22} />
        </span>
        <span>Almacena</span>
      </div>

      <button className="tienda-actual" onClick={onTiendas}>
        <span className="avatar-cuadrado">{iniciales(tienda?.nombre)}</span>
        <span className="fila-texto">
          <strong>{tienda?.nombre || 'Sin tienda'}</strong>
          <small>{tienda?.descripcion || 'Sin descripción'}</small>
        </span>
        <ChevronRight size={16} />
      </button>

      <p className="menu-titulo">Gestión</p>
      <nav className="menu">
        {MENU.map(({ id, texto, Icono }) => (
          <button
            key={id}
            className={'menu-item' + (seccion === id ? ' activo' : '')}
            onClick={() => setSeccion(id)}
          >
            <Icono size={18} />
            <span>{texto}</span>
            {id === 'productos' && totalProductos > 0 && (
              <span className="insignia">{totalProductos}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-pie">
        <button
          className={'menu-item' + (seccion === 'config' ? ' activo' : '')}
          onClick={() => setSeccion('config')}
        >
          <Settings size={18} />
          <span>Configuración</span>
        </button>

        <div className="ayuda">
          <CircleHelp size={20} />
          <span className="fila-texto">
            <strong>¿Necesitas ayuda?</strong>
            <small>Consulta nuestra guía</small>
          </span>
          <ChevronRight size={16} />
        </div>

        <button className="usuario" onClick={onPerfil}>
          <span className="avatar-redondo">{iniciales(perfil?.nombre)}</span>
          <span className="fila-texto">
            <strong>{perfil?.nombre}</strong>
            <small>{perfil?.cargo}</small>
          </span>
          <Ellipsis size={18} />
        </button>
      </div>
    </aside>
  )
}