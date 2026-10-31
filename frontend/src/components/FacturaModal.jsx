import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import Modal from './Modal.jsx'
import { api } from '../api.js'
import { dinero, fechaLarga, textoMetodo } from '../format.js'

// La factura tal como se ve y como se imprime
function HojaFactura({ venta }) {
  return (
    <article className="factura-hoja">
      <header className="factura-cabecera">
        <div>
          <h2>{venta.tienda}</h2>
          <p>Factura de venta</p>
        </div>
        <div className="factura-numero">
          <strong>{venta.factura}</strong>
          <span>{fechaLarga(venta.fecha)}</span>
        </div>
      </header>

      <dl className="factura-datos">
        <div>
          <dt>Cliente</dt>
          <dd>{venta.cliente}</dd>
        </div>
        <div>
          <dt>NIF / Documento</dt>
          <dd>{venta.documento || 'No indicado'}</dd>
        </div>
        <div>
          <dt>Método de pago</dt>
          <dd>{textoMetodo(venta.metodo_pago)}</dd>
        </div>
      </dl>

      <table className="factura-tabla">
        <thead>
          <tr>
            <th>Producto</th>
            <th className="num">Cant.</th>
            <th className="num">Precio</th>
            <th className="num">Importe</th>
          </tr>
        </thead>
        <tbody>
          {venta.items.map((i, n) => (
            <tr key={n}>
              <td>
                {i.nombre}
                <small>{i.sku}</small>
              </td>
              <td className="num">{i.cantidad}</td>
              <td className="num">{dinero(i.precio_unitario)}</td>
              <td className="num">{dinero(i.importe)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="factura-totales">
        <p>
          <span>Subtotal</span>
          <span>{dinero(venta.subtotal)}</span>
        </p>
        <p>
          <span>IVA ({venta.iva_porcentaje}%)</span>
          <span>{dinero(venta.iva)}</span>
        </p>
        <p className="total">
          <span>Total</span>
          <span>{dinero(venta.total)}</span>
        </p>
      </div>

      <footer className="factura-pie">Gracias por su compra</footer>
    </article>
  )
}

export default function FacturaModal({ tiendaId, ventaId, venta: inicial = null, onClose }) {
  const [venta, setVenta] = useState(inicial)
  const [error, setError] = useState('')

  // Si solo se conoce el id (desde el historial) se pide la factura completa
  useEffect(() => {
    if (inicial) return
    let vigente = true
    api
      .venta(tiendaId, ventaId)
      .then((v) => vigente && setVenta(v))
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [tiendaId, ventaId, inicial])

  // Seguridad: si el componente se cierra a mitad de la impresion, se limpia la marca
  useEffect(() => () => document.body.classList.remove('imprimiendo-factura'), [])

  function imprimir() {
    const tituloAnterior = document.title
    document.title = venta.factura // el navegador lo usa como nombre del PDF
    document.body.classList.add('imprimiendo-factura')
    const limpiar = () => {
      document.body.classList.remove('imprimiendo-factura')
      document.title = tituloAnterior
      window.removeEventListener('afterprint', limpiar)
    }
    window.addEventListener('afterprint', limpiar)
    window.print()
  }

  return (
    <>
      <Modal titulo={venta ? `Factura ${venta.factura}` : 'Factura'} onClose={onClose} ancho>
        {error && <p className="error">{error}</p>}
        {!venta && !error && <p className="vacio">Cargando factura...</p>}
        {venta && (
          <>
            <HojaFactura venta={venta} />
            <div className="acciones fin">
              <button className="btn btn-claro" onClick={onClose}>
                Cerrar
              </button>
              <button className="btn btn-primario" onClick={imprimir}>
                <Printer size={16} /> Imprimir / Guardar PDF
              </button>
            </div>
          </>
        )}
      </Modal>
      {/* Copia que solo se ve al imprimir; va fuera de #root para poder aislarla */}
      {venta &&
        createPortal(
          <div className="factura-portal">
            <HojaFactura venta={venta} />
          </div>,
          document.body
        )}
    </>
  )
}