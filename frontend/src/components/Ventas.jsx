import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { api } from '../api.js'
import { calcularTotales, dinero, METODOS } from '../format.js'
import Miniatura from './Miniatura.jsx'
import TablaVentas from './TablaVentas.jsx'
import FacturaModal from './FacturaModal.jsx'

const RE_DOCUMENTO = /^[A-Za-z0-9][A-Za-z0-9 .\-/]{0,29}$/

// Cantidad editable: se confirma al salir del campo o con Enter, y nunca pasa del stock
function CampoCantidad({ valor, max, nombre, onCambiar }) {
  const [texto, setTexto] = useState(String(valor))

  function confirmar() {
    const n = parseInt(texto, 10)
    const ok = Number.isInteger(n) && n >= 1 ? Math.min(n, max) : valor
    setTexto(String(ok))
    if (ok !== valor) onCambiar(ok)
  }

  return (
    <input
      inputMode="numeric"
      aria-label={`Cantidad de ${nombre}`}
      value={texto}
      onChange={(e) => setTexto(e.target.value.replace(/\D/g, '').slice(0, 5))}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
    />
  )
}

export default function Ventas({ tienda, version, onCambio, onVerHistorial }) {
  const [busqueda, setBusqueda] = useState('')
  const [q, setQ] = useState('')
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [info, setInfo] = useState(null) // { siguiente, iva, total, ventas }

  const [carrito, setCarrito] = useState([])
  const [cliente, setCliente] = useState('')
  const [documento, setDocumento] = useState('')
  const [metodo, setMetodo] = useState('efectivo')
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [factura, setFactura] = useState(null) // { id, venta? }
  const tarjetaFactura = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  // Productos: se recargan al buscar o cuando cambia el inventario
  useEffect(() => {
    let vigente = true
    api
      .productos(tienda.id, q)
      .then((d) => {
        if (!vigente) return
        setProductos(d.productos)
        setErrorCarga('')
        // El stock de lo que ya esta en la factura se actualiza con el dato mas reciente
        const actual = new Map(d.productos.map((p) => [p.id, p]))
        setCarrito((c) =>
          c
            .map((i) => {
              const p = actual.get(i.id)
              if (!p) return i
              return { ...i, stock: p.stock, cantidad: Math.min(i.cantidad, p.stock) }
            })
            .filter((i) => i.cantidad >= 1)
        )
      })
      .catch((e) => vigente && setErrorCarga(e.message))
    return () => {
      vigente = false
    }
  }, [tienda.id, q, version])

  // Numero de factura siguiente, IVA e ultimas ventas
  useEffect(() => {
    let vigente = true
    api
      .ventas(tienda.id, { limite: 5 })
      .then((d) => vigente && setInfo(d))
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [tienda.id, version])

  const iva = info?.iva ?? 21
  const totales = calcularTotales(carrito, iva)
  const unidadesEnFactura = carrito.reduce((s, i) => s + i.cantidad, 0)
  const enCarrito = new Map(carrito.map((i) => [i.id, i.cantidad]))

  function anadir(p) {
    setAviso('')
    setErrorGeneral('')
    setCarrito((c) => {
      const actual = c.find((i) => i.id === p.id)
      if (!actual) {
        if (p.stock < 1) return c
        return [
          ...c,
          {
            id: p.id,
            nombre: p.nombre,
            sku: p.sku,
            imagen: p.imagen,
            precio_venta: p.precio_venta,
            stock: p.stock,
            cantidad: 1,
          },
        ]
      }
      return c.map((i) => (i.id === p.id && i.cantidad < i.stock ? { ...i, cantidad: i.cantidad + 1 } : i))
    })
  }

  const cambiarCantidad = (id, cantidad) =>
    setCarrito((c) => c.map((i) => (i.id === id ? { ...i, cantidad } : i)))
  const quitar = (id) => setCarrito((c) => c.filter((i) => i.id !== id))

  async function registrar() {
    const errs = {}
    if (cliente.trim().length > 120) errs.cliente = 'Máximo 120 caracteres'
    if (documento.trim() && !RE_DOCUMENTO.test(documento.trim())) {
      errs.documento = 'Solo letras, números, puntos y guiones (máx. 30)'
    }
    if (Object.keys(errs).length) {
      setErrores(errs)
      return
    }
    if (carrito.length === 0) {
      setErrorGeneral('Añade al menos un producto a la factura')
      return
    }

    setEnviando(true)
    setErrores({})
    setErrorGeneral('')
    try {
      const venta = await api.crearVenta(tienda.id, {
        cliente: cliente.trim(),
        documento: documento.trim(),
        metodo_pago: metodo,
        items: carrito.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
      })
      setCarrito([])
      setCliente('')
      setDocumento('')
      setMetodo('efectivo')
      setAviso(venta.factura)
      setFactura({ id: venta.id, venta })
      onCambio() // refresca stock, resumen y numeracion
    } catch (err) {
      if (err.campo === 'cliente' || err.campo === 'documento') {
        setErrores({ [err.campo]: err.message })
      } else {
        setErrorGeneral(err.message)
      }
      const { producto_id: id, disponible } = err.datos ?? {}
      if (id) {
        // El stock cambio mientras se armaba la factura: se ajusta y se recarga
        setCarrito((c) =>
          c
            .map((i) => (i.id === id ? { ...i, stock: disponible ?? 0, cantidad: Math.min(i.cantidad, disponible ?? 0) } : i))
            .filter((i) => i.cantidad >= 1)
        )
        onCambio()
      }
    } finally {
      setEnviando(false)
    }
  }

  const lista = productos ?? []
  const conStock = lista.filter((p) => p.stock > 0).length

  let listado
  if (errorCarga && !productos) {
    listado = <p className="vacio">No se pudieron cargar los productos: {errorCarga}</p>
  } else if (!productos) {
    listado = <p className="vacio">Cargando productos...</p>
  } else if (lista.length === 0) {
    listado = (
      <p className="vacio">{q ? `Ningún producto coincide con «${q}»` : 'Aún no has agregado productos'}</p>
    )
  } else {
    listado = (
      <ul className="lista-venta">
        {lista.map((p) => {
          const usados = enCarrito.get(p.id) ?? 0
          const libres = p.stock - usados
          return (
            <li key={p.id}>
              <Miniatura producto={p} />
              <span className="fila-texto">
                <strong>{p.nombre}</strong>
                <small className={p.stock === 0 ? 'agotado' : undefined}>
                  {p.sku} · {p.stock === 0 ? 'Agotado' : `${libres} disponibles`}
                </small>
              </span>
              <strong className="precio-fila">{dinero(p.precio_venta)}</strong>
              <button
                className="btn-anadir"
                onClick={() => anadir(p)}
                disabled={libres < 1}
                aria-label={`Añadir ${p.nombre}`}
              >
                <Plus size={16} /> Añadir
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="ventas-pagina">
      <div className="encabezado">
        <div>
          <p className="fecha">Punto de venta</p>
          <h1>Nueva venta</h1>
          <p className="subtitulo">Crea facturas, descuenta existencias y consulta tus ventas recientes.</p>
        </div>
        <div className="tarjeta siguiente-factura">
          <small>Siguiente factura</small>
          <strong>{info?.siguiente ?? '...'}</strong>
        </div>
      </div>

      <div className="ventas-grid">
        <div className="ventas-izq">
          <div className="tarjeta tabla-tarjeta tarjeta-prod">
            <div className="tarjeta-cabecera">
              <div>
                <h2>Seleccionar productos</h2>
                <p className="subtitulo-chico">
                  {productos ? `${conStock} referencias disponibles` : 'Cargando...'}
                </p>
              </div>
              <div className="buscador-tabla">
                <div className="campo-busqueda">
                  <Search size={16} />
                  <input
                    placeholder="Buscar producto o SKU..."
                    aria-label="Buscar producto o SKU"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </div>
            </div>
            {listado}
          </div>

          <div className="tarjeta tabla-tarjeta tarjeta-rec">
            <div className="tarjeta-cabecera">
              <div>
                <h2>Ventas recientes</h2>
                <p className="subtitulo-chico">Últimas facturas emitidas</p>
              </div>
              {info && <span className="etiqueta verde">{info.total} {info.total === 1 ? 'venta' : 'ventas'}</span>}
            </div>
            {!info ? (
              <p className="vacio">Cargando...</p>
            ) : info.ventas.length === 0 ? (
              <p className="vacio">Aún no has registrado ventas</p>
            ) : (
              <>
                <TablaVentas ventas={info.ventas} onFactura={(id) => setFactura({ id })} />
                <div className="tabla-pie">
                  <span>
                    Mostrando {info.ventas.length} de {info.total} facturas
                  </span>
                  <button className="enlace" onClick={onVerHistorial}>
                    Ver historial en Reportes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="tarjeta tarjeta-fact" id="factura-actual" ref={tarjetaFactura}>
          <div className="fact-cabecera">
            <span className="icono-kpi" style={{ background: '#def0e4', color: '#1f5a41' }}>
              <Receipt size={20} />
            </span>
            <div>
              <h2>Factura actual</h2>
              <p className="subtitulo-chico">
                {carrito.length} {carrito.length === 1 ? 'producto añadido' : 'productos añadidos'}
              </p>
            </div>
          </div>

          <div className="venta-form">
            <label>
              Cliente
              <input
                placeholder="Cliente general"
                value={cliente}
                maxLength={120}
                aria-invalid={errores.cliente ? 'true' : 'false'}
                onChange={(e) => {
                  setCliente(e.target.value)
                  setErrores({ ...errores, cliente: undefined })
                }}
              />
              {errores.cliente && <small className="campo-error" role="alert">{errores.cliente}</small>}
            </label>
            <label>
              NIF / Documento
              <input
                placeholder="Opcional"
                value={documento}
                maxLength={30}
                aria-invalid={errores.documento ? 'true' : 'false'}
                onChange={(e) => {
                  setDocumento(e.target.value)
                  setErrores({ ...errores, documento: undefined })
                }}
              />
              {errores.documento && <small className="campo-error" role="alert">{errores.documento}</small>}
            </label>
            <label className="ancho-total">
              Método de pago
              <span className="selector selector-ancho">
                <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                  {METODOS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.texto}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </span>
            </label>
          </div>

          <div className="fact-cuerpo">
            {carrito.length === 0 ? (
              <div className="factura-vacia">
                <span className="icono-vacio">
                  <ShoppingCart size={22} />
                </span>
                <strong>La factura está vacía</strong>
                <small>Añade productos para comenzar una venta.</small>
              </div>
            ) : (
              <ul className="items-carrito">
                {carrito.map((i) => (
                  <li key={i.id} className="item-carrito">
                    <Miniatura producto={i} tam={40} />
                    <span className="fila-texto">
                      <strong>{i.nombre}</strong>
                      <small>{dinero(i.precio_venta)} c/u</small>
                    </span>
                    <button
                      className="btn-quitar"
                      onClick={() => quitar(i.id)}
                      aria-label={`Quitar ${i.nombre} de la factura`}
                    >
                      <Trash2 size={16} />
                    </button>
                    <span className="cantidad">
                      <span className="stepper">
                        <button
                          onClick={() => cambiarCantidad(i.id, i.cantidad - 1)}
                          disabled={i.cantidad <= 1}
                          aria-label={`Menos ${i.nombre}`}
                        >
                          <Minus size={14} />
                        </button>
                        <CampoCantidad
                          key={i.cantidad}
                          valor={i.cantidad}
                          max={i.stock}
                          nombre={i.nombre}
                          onCambiar={(n) => cambiarCantidad(i.id, n)}
                        />
                        <button
                          onClick={() => cambiarCantidad(i.id, i.cantidad + 1)}
                          disabled={i.cantidad >= i.stock}
                          aria-label={`Más ${i.nombre}`}
                        >
                          <Plus size={14} />
                        </button>
                      </span>
                      {i.cantidad >= i.stock && <small className="maximo">Máximo disponible</small>}
                    </span>
                    <strong className="importe">{dinero(Math.round(i.precio_venta * 100) * i.cantidad / 100)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="fact-totales">
            <p>
              <span>Subtotal</span>
              <span>{dinero(totales.subtotal)}</span>
            </p>
            <p>
              <span>IVA ({iva}%)</span>
              <span>{dinero(totales.iva)}</span>
            </p>
            <p className="total">
              <span>Total</span>
              <span>{dinero(totales.total)}</span>
            </p>
          </div>

          {errorGeneral && <p className="error" role="alert">{errorGeneral}</p>}
          {aviso && (
            <p className="aviso-ok" role="status">
              <Check size={16} /> Venta registrada correctamente · {aviso}
            </p>
          )}

          <button
            className="btn btn-primario ancho btn-registrar"
            onClick={registrar}
            disabled={enviando || carrito.length === 0}
          >
            <Receipt size={18} /> {enviando ? 'Registrando...' : 'Registrar venta y generar factura'}
          </button>
        </div>
      </div>

      {carrito.length > 0 && (
        <div className="barra-carrito">
          <span>
            <strong>{unidadesEnFactura}</strong> {unidadesEnFactura === 1 ? 'unidad' : 'unidades'} · {dinero(totales.total)}
          </span>
          <button
            className="btn btn-primario btn-chico"
            onClick={() => tarjetaFactura.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Ver factura
          </button>
        </div>
      )}

      {factura && (
        <FacturaModal
          tiendaId={tienda.id}
          ventaId={factura.id}
          venta={factura.venta}
          onClose={() => setFactura(null)}
        />
      )}
    </div>
  )
}