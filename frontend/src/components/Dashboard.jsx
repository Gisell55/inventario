import { useState } from 'react'
import {
  ArrowUpToLine,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dinero, etiquetaDia, saludo, stockBajo } from '../format.js'
import Miniatura from './Miniatura.jsx'

export default function Dashboard({ resumen, nombre, dias, setDias, onNuevoProducto, onVerProductos }) {
  const [filtro, setFiltro] = useState('')
  const r = resumen

  const fecha = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const datos = r.actividad.map((d) => ({ ...d, etiqueta: etiquetaDia(d.fecha, dias) }))
  const maxY = Math.max(30, ...datos.map((d) => Math.max(d.ventas, d.objetivo)))
  const sinVentas = datos.every((d) => d.ventas === 0)

  const texto = filtro.toLowerCase()
  const recientes = r.recientes.filter(
    (p) => p.nombre.toLowerCase().includes(texto) || p.sku.toLowerCase().includes(texto)
  )

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="fecha">{fecha}</p>
          <h1>
            {saludo()}, {nombre.split(' ')[0]}
          </h1>
          <p className="subtitulo">Aquí tienes un resumen de lo que ocurre en tu inventario.</p>
        </div>
        <div className="acciones">
          <button className="btn btn-claro">
            <Download size={16} /> Exportar
          </button>
          <button className="btn btn-primario" onClick={onNuevoProducto}>
            <Plus size={16} /> Nuevo producto
          </button>
        </div>
      </div>

      <div className="tarjetas">
        <div className="tarjeta kpi">
          <span className="icono-kpi" style={{ background: '#d9efe0', color: '#1f5a41' }}>
            <Package size={20} />
          </span>
          <p className="kpi-titulo">Valor del inventario</p>
          <p className="kpi-valor">{dinero(r.valorInventario)}</p>
          <p className="kpi-nota">Valor estimado a precio de venta</p>
        </div>

        <div className="tarjeta kpi">
          <span className="icono-kpi" style={{ background: '#dfe8f5', color: '#3b5b8f' }}>
            <Package size={20} />
          </span>
          <p className="kpi-titulo">Total de productos</p>
          <p className="kpi-valor">{r.totalProductos}</p>
          <p className="kpi-nota">{r.unidades} unidades disponibles</p>
        </div>

        <div className={'tarjeta kpi' + (r.stockBajo > 0 ? ' alerta' : '')}>
          <span className="icono-kpi" style={{ background: '#fbe5da', color: '#c4572b' }}>
            <ArrowUpToLine size={20} />
          </span>
          {r.stockBajo > 0 && <span className="punto" />}
          <p className="kpi-titulo">Stock bajo</p>
          <p className="kpi-valor">{r.stockBajo}</p>
          <p className="kpi-nota">Requieren tu atención</p>
        </div>

        <div className="tarjeta kpi">
          <span className="icono-kpi" style={{ background: '#ebe3f6', color: '#6b4fa3' }}>
            <CalendarDays size={20} />
          </span>
          <p className="kpi-titulo">Ventas registradas</p>
          <p className="kpi-valor">{dinero(r.ventasMes)}</p>
          <p className="kpi-nota">{r.facturasMes} facturas emitidas este mes</p>
        </div>
      </div>

      <div className="fila-doble">
        <div className="tarjeta">
          <div className="tarjeta-cabecera">
            <div>
              <h2>Actividad comercial</h2>
              <p className="subtitulo-chico">Ventas de los últimos {dias} días</p>
            </div>
            <div className="selector">
              <select value={dias} onChange={(e) => setDias(Number(e.target.value))}>
                <option value={7}>Últimos 7 días</option>
                <option value={30}>Últimos 30 días</option>
              </select>
              <ChevronDown size={14} />
            </div>
          </div>

          <div className="leyenda">
            <span><i style={{ background: '#2f7a57' }} /> Ventas</span>
            <span><i style={{ background: '#c5ddd0' }} /> Objetivo</span>
          </div>

          <div className="grafico">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} barGap={2}>
                <CartesianGrid vertical={false} stroke="#e6ebe6" />
                <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  domain={[0, maxY]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={32}
                />
                <Tooltip formatter={(v) => dinero(v)} />
                <Bar dataKey="ventas" name="Ventas" fill="#2f7a57" radius={[3, 3, 0, 0]} barSize={8} />
                <Bar dataKey="objetivo" name="Objetivo" fill="#c5ddd0" radius={[3, 3, 0, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
            {sinVentas && <p className="vacio-grafico">Aún no hay ventas registradas</p>}
          </div>
        </div>

        <div className="tarjeta">
          <div className="tarjeta-cabecera">
            <div>
              <h2>Alertas de stock</h2>
              <p className="subtitulo-chico">Productos por debajo del mínimo</p>
            </div>
            <button className="enlace" onClick={onVerProductos}>
              Ver todos <ChevronRight size={14} />
            </button>
          </div>

          {r.alertas.length === 0 ? (
            <p className="vacio">Sin alertas de stock</p>
          ) : (
            <>
              <ul className="alertas">
                {r.alertas.map((a) => (
                  <li key={a.id}>
                    <Miniatura producto={a} />
                    <span className="fila-texto">
                      <strong>{a.nombre}</strong>
                      <small>{a.stock} de {a.stock_minimo} uds.</small>
                    </span>
                    <span className="etiqueta rojo">Bajo</span>
                  </li>
                ))}
              </ul>
              <button className="btn btn-claro ancho" onClick={onVerProductos}>
                Gestionar reposición
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tarjeta tabla-tarjeta">
        <div className="tarjeta-cabecera">
          <div>
            <h2>Inventario reciente</h2>
            <p className="subtitulo-chico">Consulta y gestiona tus productos</p>
          </div>
          <div className="buscador-tabla">
            <div className="campo-busqueda">
              <Search size={16} />
              <input
                placeholder="Buscar producto..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>
            <button className="btn-icono borde" aria-label="Filtros">
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recientes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="vacio">
                    {r.totalProductos === 0
                      ? 'Aún no has agregado productos'
                      : 'Ningún producto coincide con la búsqueda'}
                  </td>
                </tr>
              ) : (
                recientes.map((p) => {
                  const bajo = stockBajo(p)
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="celda-producto">
                          <Miniatura producto={p} />
                          <span className="fila-texto">
                            <strong>{p.nombre}</strong>
                            <small>{p.sku}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong>{p.stock}</strong> <small>/ min. {p.stock_minimo}</small>
                      </td>
                      <td><strong>{dinero(p.precio_venta)}</strong></td>
                      <td>
                        <span className={'etiqueta ' + (bajo ? 'rojo' : 'verde')}>
                          <i /> {bajo ? 'Stock bajo' : 'Disponible'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="tabla-pie">
          <span>Mostrando {r.recientes.length} de {r.totalProductos} productos</span>
          <button className="enlace" onClick={onVerProductos}>
            Ver todos los productos <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </>
  )
}