import { useEffect, useState } from 'react'
import { Receipt, Search, TrendingUp, Wallet } from 'lucide-react'
import { api } from '../api.js'
import { dinero } from '../format.js'
import TablaVentas from './TablaVentas.jsx'
import FacturaModal from './FacturaModal.jsx'

const LIMITE = 100

export default function Reportes({ tienda, version }) {
  const [busqueda, setBusqueda] = useState('')
  const [q, setQ] = useState('')
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [facturaId, setFacturaId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  useEffect(() => {
    let vigente = true
    api
      .ventas(tienda.id, { q, limite: LIMITE })
      .then((d) => {
        if (!vigente) return
        setDatos(d)
        setError('')
      })
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [tienda.id, q, version])

  const mes = datos?.mes ?? { total: 0, facturas: 0 }
  const ticketMedio = mes.facturas > 0 ? mes.total / mes.facturas : 0

  let cuerpo
  if (error && !datos) {
    cuerpo = <p className="vacio">No se pudo cargar el historial: {error}</p>
  } else if (!datos) {
    cuerpo = <p className="vacio">Cargando historial...</p>
  } else if (datos.total === 0) {
    cuerpo = <p className="vacio">Aún no has registrado ventas</p>
  } else if (datos.ventas.length === 0) {
    cuerpo = <p className="vacio">Ninguna factura coincide con «{q}»</p>
  } else {
    cuerpo = <TablaVentas ventas={datos.ventas} conMetodo onFactura={setFacturaId} />
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="fecha">Análisis</p>
          <h1>Reportes</h1>
          <p className="subtitulo">Historial de ventas y facturas emitidas en {tienda.nombre}.</p>
        </div>
      </div>

      <div className="kpis-productos">
        <div className="tarjeta kpi-h">
          <span className="icono-kpi" style={{ background: '#d9efe0', color: '#1f5a41' }}>
            <TrendingUp size={22} />
          </span>
          <div>
            <p className="kpi-h-titulo">Ventas del mes</p>
            <p className="kpi-h-valor">{dinero(mes.total)}</p>
          </div>
        </div>
        <div className="tarjeta kpi-h">
          <span className="icono-kpi" style={{ background: '#dfe8f5', color: '#3b5b8f' }}>
            <Receipt size={22} />
          </span>
          <div>
            <p className="kpi-h-titulo">Facturas del mes</p>
            <p className="kpi-h-valor">{mes.facturas}</p>
          </div>
        </div>
        <div className="tarjeta kpi-h">
          <span className="icono-kpi" style={{ background: '#ebe3f6', color: '#6b4fa3' }}>
            <Wallet size={22} />
          </span>
          <div>
            <p className="kpi-h-titulo">Ticket medio</p>
            <p className="kpi-h-valor">{dinero(ticketMedio)}</p>
          </div>
        </div>
      </div>

      <div className="tarjeta tabla-tarjeta">
        <div className="tarjeta-cabecera">
          <div>
            <h2>Historial de ventas</h2>
            <p className="subtitulo-chico">Facturas emitidas, de la más reciente a la más antigua</p>
          </div>
          <div className="buscador-tabla">
            <div className="campo-busqueda">
              <Search size={16} />
              <input
                placeholder="Buscar por factura o cliente..."
                aria-label="Buscar por factura o cliente"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </div>

        {cuerpo}

        {datos && datos.ventas.length > 0 && (
          <div className="tabla-pie">
            <span>
              Mostrando {datos.ventas.length} de {datos.total} facturas
            </span>
            {datos.total > LIMITE && !q && <span>Se muestran las {LIMITE} más recientes</span>}
          </div>
        )}
      </div>

      {facturaId && (
        <FacturaModal tiendaId={tienda.id} ventaId={facturaId} onClose={() => setFacturaId(null)} />
      )}
    </>
  )
}