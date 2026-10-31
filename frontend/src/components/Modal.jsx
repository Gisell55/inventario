import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ titulo, onClose, ancho = false, children }) {
  // Escape cierra el cuadro de diálogo
  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [onClose])

  return (
    <div className="modal-fondo" onClick={onClose}>
      <div
        className={'modal' + (ancho ? ' modal-ancho' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-cabecera">
          <h3>{titulo}</h3>
          <button className="btn-icono" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}