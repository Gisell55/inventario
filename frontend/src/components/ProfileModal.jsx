import { useState } from 'react'
import Modal from './Modal.jsx'
import { api } from '../api.js'

export default function ProfileModal({ perfil, onGuardado, onClose }) {
  const [form, setForm] = useState({
    nombre: perfil.nombre,
    correo: perfil.correo,
    cargo: perfil.cargo,
  })
  const [error, setError] = useState('')

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  async function guardar(e) {
    e.preventDefault()
    setError('')
    try {
      onGuardado(await api.guardarPerfil(form))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal titulo="Editar perfil" onClose={onClose}>
      <form onSubmit={guardar} className="formulario">
        <label>
          Nombre completo
          <input value={form.nombre} onChange={cambiar('nombre')} />
        </label>
        <label>
          Correo
          <input type="email" value={form.correo} onChange={cambiar('correo')} />
        </label>
        <label>
          Cargo
          <input value={form.cargo} onChange={cambiar('cargo')} />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <button type="button" className="btn btn-claro" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primario">
            Guardar cambios
          </button>
        </div>
      </form>
    </Modal>
  )
}