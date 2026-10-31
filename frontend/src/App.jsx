import { useCallback, useEffect, useState } from 'react'
import { api, onSesionExpirada, sesion } from './api.js'
import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import Panel from './components/Panel.jsx'

export default function App() {
  // 'cargando' mientras se valida el token guardado; 'listo' cuando se sabe si hay sesión
  const [estado, setEstado] = useState(() => (sesion.token() ? 'cargando' : 'listo'))
  const [usuario, setUsuario] = useState(null)
  const [vista, setVista] = useState('login') // 'login' | 'registro'

  const cerrarSesion = useCallback(() => {
    sesion.borrar()
    setUsuario(null)
    setVista('login')
    setEstado('listo')
  }, [])

  // Si el servidor rechaza el token en cualquier petición, vuelve al login
  useEffect(() => {
    onSesionExpirada(cerrarSesion)
  }, [cerrarSesion])

  // La sesión sobrevive a recargar la página: se valida el token guardado
  const restaurar = useCallback(() => {
    if (!sesion.token()) return
    api
      .me()
      .then((u) => {
        setUsuario(u)
        setEstado('listo')
      })
      .catch((err) => {
        if (err.status === 401) cerrarSesion()
        else setEstado('sinconexion')
      })
  }, [cerrarSesion])

  useEffect(() => {
    restaurar()
  }, [restaurar])

  function reintentar() {
    setEstado('cargando')
    restaurar()
  }

  function alAutenticar(token, u) {
    sesion.guardar(token)
    setUsuario(u)
  }

  if (estado === 'cargando') {
    return <div className="pantalla-centro">Cargando...</div>
  }

  if (estado === 'sinconexion') {
    return (
      <div className="pantalla-centro">
        <p>No se pudo conectar con el servidor.</p>
        <button className="btn btn-primario" onClick={reintentar}>
          Reintentar
        </button>
      </div>
    )
  }

  if (usuario) {
    return <Panel key={usuario.id} usuario={usuario} onUsuario={setUsuario} onLogout={cerrarSesion} />
  }

  return vista === 'login' ? (
    <Login onAutenticado={alAutenticar} onIrRegistro={() => setVista('registro')} />
  ) : (
    <Register onAutenticado={alAutenticar} onIrLogin={() => setVista('login')} />
  )
}