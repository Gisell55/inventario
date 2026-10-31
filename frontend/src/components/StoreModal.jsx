import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import Modal from './Modal.jsx'
import { api } from '../api.js'
import { iniciales } from '../format.js'

export default function StoreModal({ tiendas, tiendaId, onElegir, onCreada, onClose }) {
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState('')

  async function crear(e) {
    e.preventDefault()
    setError('')
    try {
      const nueva = await api.crearTienda({ nombre, descripcion })
      onCreada(nueva)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal titulo="Mis tiendas" onClose={onClose}>
      <ul className="lista-tiendas">
        {tiendas.map((t) => (
          <li key={t.id}>
            <button
              className={'fila-tienda' + (t.id === tiendaId ? ' activa' : '')}
              onClick={() => onElegir(t.id)}
            >
              <span className="avatar-cuadrado">{iniciales(t.nombre)}</span>
              <span className="fila-texto">
                <strong>{t.nombre}</strong>
                <small>{t.descripcion || 'Sin descripción'}</small>
              </span>
              {t.id === tiendaId && <Check size={18} />}
            </button>
          </li>
        ))}
      </ul>

      {!creando ? (
        <button className="btn btn-claro ancho" onClick={() => setCreando(true)}>
          <Plus size={16} /> Agregar nueva tienda
        </button>
      ) : (
        <form onSubmit={crear} className="formulario">
          <label>
            Nombre de la tienda
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          </label>
          <label>
            Descripción (opcional)
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="acciones">
            <button type="button" className="btn btn-claro" onClick={() => setCreando(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario">
              Crear tienda
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}