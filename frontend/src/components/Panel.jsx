import { useEffect, useState } from 'react'
import { Menu, Plus, Search } from 'lucide-react'
import { almacen, api } from '../api.js'
import Sidebar from './Sidebar.jsx'
import Dashboard from './Dashboard.jsx'
import StoreModal from './StoreModal.jsx'
import ProfileModal from './ProfileModal.jsx'
import UserMenu from './UserMenu.jsx'
import Productos from './Productos.jsx'
import ProductModal from './ProductModal.jsx'
import Ventas from './Ventas.jsx'
import Reportes from './Reportes.jsx'

export default function Panel({ usuario, onUsuario, onLogout }) {
  const claveTienda = `tiendaId_${usuario.id}`
  const [tiendas, setTiendas] = useState(null) // null = aún cargando
  const [tiendaId, setTiendaId] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [dias, setDias] = useState(7)
  const [seccion, setSeccion] = useState('resumen')
  const [modal, setModal] = useState(null) // 'tiendas' | 'perfil' | 'producto' | null
  const [version, setVersion] = useState(0) // sube cada vez que cambian productos o ventas
  const [menuAbierto, setMenuAbierto] = useState(false) // menú lateral en móvil
  const [error, setError] = useState('')

  // Tiendas del usuario
  useEffect(() => {
    api
      .tiendas()
      .then((t) => {
        setTiendas(t)
        const guardada = Number(almacen.leer(claveTienda))
        setTiendaId(t.find((x) => x.id === guardada)?.id ?? t[0]?.id ?? null)
      })
      .catch((e) => setError(e.message))
  }, [claveTienda])

  // Resumen de la tienda activa (se recalcula al cargar, eliminar o vender productos)
  useEffect(() => {
    if (!tiendaId) return
    api
      .resumen(tiendaId, dias)
      .then(setResumen)
      .catch((e) => setError(e.message))
  }, [tiendaId, dias, version])

  const productosCambiaron = () => setVersion((v) => v + 1)

  function elegirTienda(id) {
    almacen.escribir(claveTienda, id)
    setResumen(null)
    setTiendaId(id)
    setModal(null)
  }

  function tiendaCreada(nueva) {
    setTiendas((t) => [...(t ?? []), nueva])
    elegirTienda(nueva.id)
  }

  // Cada acción del menú lateral lo cierra (solo importa en móvil)
  const conCierre = (fn) => (...args) => {
    setMenuAbierto(false)
    fn(...args)
  }

  const tienda = tiendas?.find((t) => t.id === tiendaId)

  let contenido
  if (error) {
    contenido = <p className="estado-global">No se pudo cargar la información: {error}</p>
  } else if (tiendas === null) {
    contenido = <p className="estado-global">Cargando...</p>
  } else if (tiendas.length === 0) {
    contenido = (
      <div className="estado-global">
        <p>Aún no tienes ninguna tienda.</p>
        <button className="btn btn-primario" onClick={() => setModal('tiendas')}>
          <Plus size={16} /> Crear mi primera tienda
        </button>
      </div>
    )
  } else if (seccion === 'productos' && tienda) {
    contenido = (
      <Productos
        key={tienda.id}
        tienda={tienda}
        version={version}
        onCargar={() => setModal('producto')}
        onCambio={productosCambiaron}
      />
    )
  } else if (seccion === 'ventas' && tienda) {
    contenido = (
      <Ventas
        key={tienda.id}
        tienda={tienda}
        version={version}
        onCambio={productosCambiaron}
        onVerHistorial={() => setSeccion('reportes')}
      />
    )
  } else if (seccion === 'reportes' && tienda) {
    contenido = <Reportes key={tienda.id} tienda={tienda} version={version} />
  } else if (seccion !== 'resumen') {
    contenido = <p className="estado-global">Esta sección se construirá en los siguientes pasos.</p>
  } else if (!resumen) {
    contenido = <p className="estado-global">Cargando resumen...</p>
  } else {
    contenido = (
      <Dashboard
        resumen={resumen}
        nombre={usuario.nombre}
        dias={dias}
        setDias={setDias}
        onNuevoProducto={() => setModal('producto')}
        onVerProductos={() => setSeccion('productos')}
      />
    )
  }

  return (
    <div className="app">
      <Sidebar
        abierto={menuAbierto}
        seccion={seccion}
        setSeccion={conCierre(setSeccion)}
        tienda={tienda}
        perfil={usuario}
        totalProductos={resumen?.totalProductos ?? 0}
        onTiendas={conCierre(() => setModal('tiendas'))}
        onPerfil={conCierre(() => setModal('perfil'))}
      />
      {menuAbierto && <div className="sidebar-fondo" onClick={() => setMenuAbierto(false)} />}

      <div className="contenido">
        <header className="barra">
          <button
            className="btn-icono borde boton-menu"
            aria-label="Abrir menú"
            onClick={() => setMenuAbierto(true)}
          >
            <Menu size={20} />
          </button>
          <div className="campo-busqueda grande">
            <Search size={16} />
            <input placeholder="Buscar productos y facturas..." />
            <kbd>Ctrl K</kbd>
          </div>
          <div className="barra-acciones">
            <UserMenu usuario={usuario} onLogout={onLogout} />
          </div>
        </header>

        <main className="principal">{contenido}</main>
      </div>

      {modal === 'tiendas' && (
        <StoreModal
          tiendas={tiendas ?? []}
          tiendaId={tiendaId}
          onElegir={elegirTienda}
          onCreada={tiendaCreada}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'producto' && tienda && (
        <ProductModal
          tiendaId={tienda.id}
          onCreado={() => {
            setModal(null)
            productosCambiaron()
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'perfil' && (
        <ProfileModal
          perfil={usuario}
          onGuardado={(p) => {
            onUsuario(p)
            setModal(null)
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}