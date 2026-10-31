import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import Modal from './Modal.jsx'

export default function ConfirmModal({ titulo, mensaje, textoConfirmar = 'Eliminar', onConfirmar, onClose }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function confirmar() {
    setEnviando(true)
    setError('')
    try {
      await onConfirmar()
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={titulo} onClose={enviando ? () => {} : onClose}>
      <div className="confirmar">
        <span className="confirmar-icono">
          <TriangleAlert size={22} />
        </span>
        <p>{mensaje}</p>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="acciones fin">
        <button className="btn btn-claro" onClick={onClose} disabled={enviando} autoFocus>
          Cancelar
        </button>
        <button className="btn btn-peligro" onClick={confirmar} disabled={enviando}>
          {enviando ? 'Eliminando...' : textoConfirmar}
        </button>
      </div>
    </Modal>
  )
}