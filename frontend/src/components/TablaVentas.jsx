import { FileText } from 'lucide-react'
import { dinero, fechaCorta, textoMetodo } from '../format.js'

// Tabla de facturas emitidas (la usan Ventas y Reportes)
export default function TablaVentas({ ventas, conMetodo = false, onFactura }) {
  return (
    <div className="tabla-scroll">
      <table className="tabla-ventas">
        <thead>
          <tr>
            <th>Factura</th>
            <th>Cliente</th>
            <th>Fecha</th>
            {conMetodo && <th>Pago</th>}
            <th>Total</th>
            <th>
              <span className="solo-lector">Factura</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((v) => (
            <tr key={v.id}>
              <td className="celda-principal">
                <strong>{v.factura}</strong>
              </td>
              <td data-label="Cliente">{v.cliente}</td>
              <td data-label="Fecha">{fechaCorta(v.fecha)}</td>
              {conMetodo && <td data-label="Pago">{textoMetodo(v.metodo_pago)}</td>}
              <td data-label="Total">
                <strong>{dinero(v.total)}</strong>
              </td>
              <td className="celda-acciones">
                <button
                  className="enlace"
                  onClick={() => onFactura(v.id)}
                  aria-label={`Ver factura ${v.factura}`}
                >
                  <FileText size={16} /> Factura
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}