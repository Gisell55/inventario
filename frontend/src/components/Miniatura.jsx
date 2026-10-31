import { Package } from 'lucide-react'
import { urlArchivo } from '../api.js'

const COLORES = ['#f3e6d3', '#ecdcd3', '#dfeaf0', '#e9e1f3', '#dcebe0']

// Foto del producto; si no tiene, un icono sobre un color estable según su id
export default function Miniatura({ producto, tam = 44 }) {
  const src = urlArchivo(producto.imagen)
  return (
    <span
      className="miniatura"
      style={{ width: tam, height: tam, background: COLORES[producto.id % COLORES.length] }}
    >
      {src ? <img src={src} alt="" loading="lazy" /> : <Package size={Math.round(tam * 0.4)} />}
    </span>
  )
}