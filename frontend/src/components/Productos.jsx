import { useEffect, useState } from 'react'
import { FileText, Package, Plus, Search, Trash2, TrendingUp, Boxes } from 'lucide-react'
import { api } from '../api.js'
import { dinero, stockBajo } from '../format.js'
import Miniatura from './Miniatura.jsx'
import ConfirmModal from './ConfirmModal.jsx'

export default function Productos({ tienda, version, onCargar, onCambio }) {
  const [busqueda, setBusqueda] = useState('')
  const [q, setQ] = useState('') // la búsqueda se envía al servidor con una pequeña espera
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [actualizado, setActualizado] = useState(null)
  const [aEliminar, setAEliminar] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  // Se vuelve a cargar al cambiar la búsqueda o cuando se carga/elimina un producto
  useEffect(() => {
    let vigente = true
    api
      .productos(tienda.id, q)
      .then((d) => {
        if (!vigente) return
        setDatos(d)
        setError('')
        setActualizado(new Date())
      })
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [tienda.id, q, version])

  async function eliminar() {
    await api.eliminarProducto(tienda.id, aEliminar.id)
    setAEliminar(null)
    onCambio()
  }

  const lista = datos?.productos ?? []
  const hora = actualizado?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  // Totales del listado imprimible (solo de lo que se imprime)
  const unidadesLista = lista.reduce((s, p) => s + p.stock, 0)
  const valorLista = lista.reduce((s, p) => s + Math.round(p.stock * p.precio_venta * 100), 0) / 100

  let cuerpo
  if (error && !datos) {
    cuerpo = <p className="vacio">No se pudieron cargar los productos: {error}</p>
  } else if (!datos) {
    cuerpo = <p className="vacio">Cargando productos...</p>
  } else if (datos.total === 0) {
    cuerpo = (
      <div className="vacio vacio-accion">
        <p>Aún no has agregado productos</p>
        <button className="btn btn-primario" onClick={onCargar}>
          <Plus size={16} /> Cargar producto
        </button>
      </div>
    )
  } else if (lista.length === 0) {
    cuerpo = <p className="vacio">Ningún producto coincide con «{q}»</p>
  } else {
    cuerpo = (
      <div className="tabla-scroll">
        <table className="tabla-productos">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio compra</th>
              <th>Precio venta</th>
              <th>Mayorista</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const bajo = stockBajo(p)
              return (
                <tr key={p.id}>
                  <td className="celda-principal">
                    <div className="celda-producto">
                      <Miniatura producto={p} />
                      <span className="fila-texto">
                        <strong>{p.nombre}</strong>
                        <small>{p.sku}</small>
                      </span>
                    </div>
                  </td>
                  <td data-label="Precio compra">
                    <strong>{dinero(p.precio_compra)}</strong>
                  </td>
                  <td data-label="Precio venta">
                    <strong>{dinero(p.precio_venta)}</strong>
                  </td>
                  <td data-label="Mayorista">
                    <strong>{dinero(p.precio_mayorista)}</strong>
                  </td>
                  <td data-label="Stock" className="stock-num">
                    <strong>{p.stock}</strong> <small>uds.</small>
                  </td>
                  <td data-label="Estado">
                    <span className={'etiqueta ' + (bajo ? 'rojo' : 'verde')}>
                      <i /> {bajo ? 'Stock bajo' : 'Disponible'}
                    </span>
                  </td>
                  <td className="celda-acciones">
                    <button
                      className="btn-eliminar"
                      aria-label={`Eliminar ${p.nombre}`}
                      onClick={() => setAEliminar(p)}
                    >
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
      <div className="no-imprimir">
        <div className="encabezado">
          <div>
            <p className="fecha">Gestión de inventario</p>
            <h1>Productos</h1>
            <p className="subtitulo">Administra tu catálogo, precios y existencias desde un solo lugar.</p>
          </div>
          <div className="acciones">
            <button
              className="btn btn-claro"
              onClick={() => window.print()}
              disabled={lista.length === 0}
              title={lista.length === 0 ? 'No hay productos para imprimir' : undefined}
            >
              <FileText size={16} /> Generar PDF
            </button>
            <button className="btn btn-primario" onClick={onCargar}>
              <Plus size={16} /> Cargar producto
            </button>
          </div>
        </div>

        <div className="kpis-productos">
          <div className="tarjeta kpi-h">
            <span className="icono-kpi" style={{ background: '#d9efe0', color: '#1f5a41' }}>
              <Package size={22} />
            </span>
            <div>
              <p className="kpi-h-titulo">Total de productos</p>
              <p className="kpi-h-valor">{datos?.total ?? 0}</p>
            </div>
          </div>
          <div className="tarjeta kpi-h">
            <span className="icono-kpi" style={{ background: '#dfe8f5', color: '#3b5b8f' }}>
              <Boxes size={22} />
            </span>
            <div>
              <p className="kpi-h-titulo">Unidades en stock</p>
              <p className="kpi-h-valor">{datos?.unidades ?? 0}</p>
            </div>
          </div>
          <div className="tarjeta kpi-h">
            <span className="icono-kpi" style={{ background: '#f3e6d3', color: '#7a5a2e' }}>
              <TrendingUp size={22} />
            </span>
            <div>
              <p className="kpi-h-titulo">Valor a precio de venta</p>
              <p className="kpi-h-valor">{dinero(datos?.valor ?? 0)}</p>
            </div>
          </div>
        </div>

        <div className="tarjeta tabla-tarjeta">
          <div className="tarjeta-cabecera">
            <div>
              <h2>Catálogo de productos</h2>
              <p className="subtitulo-chico">
                {datos
                  ? `${lista.length} ${lista.length === 1 ? 'producto encontrado' : 'productos encontrados'}`
                  : 'Cargando...'}
              </p>
            </div>
            <div className="buscador-tabla">
              <div className="campo-busqueda">
                <Search size={16} />
                <input
                  placeholder="Buscar por nombre o SKU..."
                  aria-label="Buscar por nombre o SKU"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </div>

          {cuerpo}

          {datos && datos.total > 0 && (
            <div className="tabla-pie">
              <span>
                Mostrando {lista.length} de {datos.total} productos
              </span>
              <span>Inventario actualizado a las {hora}</span>
            </div>
          )}
        </div>
      </div>

      {/* Listado que se ve solo al imprimir o guardar como PDF */}
      <div className="solo-imprimir">
        <div className="imp-cabecera">
          <h1>Listado de productos</h1>
          <p>
            {tienda.nombre} · Inventario al{' '}
            {actualizado?.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
          {q && <p>Filtro aplicado: «{q}»</p>}
        </div>
        <table className="imp-tabla">
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th className="num">P. compra</th>
              <th className="num">P. venta</th>
              <th className="num">Mayorista</th>
              <th className="num">Stock</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{p.sku}</td>
                <td className="num">{dinero(p.precio_compra)}</td>
                <td className="num">{dinero(p.precio_venta)}</td>
                <td className="num">{dinero(p.precio_mayorista)}</td>
                <td className="num">{p.stock}</td>
                <td>{stockBajo(p) ? 'Stock bajo' : 'Disponible'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="imp-totales">
          {lista.length} productos · {unidadesLista} unidades · Valor a precio de venta:{' '}
          {dinero(valorLista)}
        </p>
      </div>

      {aEliminar && (
        <ConfirmModal
          titulo="Eliminar producto"
          mensaje={`¿Seguro que quieres eliminar «${aEliminar.nombre}»? Esta acción no se puede deshacer y el producto dejará de contarse en el resumen.`}
          onConfirmar={eliminar}
          onClose={() => setAEliminar(null)}
        />
      )}
    </>
  )
}