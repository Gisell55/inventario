import { useState } from 'react'
import { ChevronRight, Lock, Mail } from 'lucide-react'
import AuthLayout from './AuthLayout.jsx'
import Campo from './Campo.jsx'
import { api } from '../api.js'
import { validarLogin } from '../validar.js'

// Evita abrir el teclado del celular al cargar la pantalla
const enfocar = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

export default function Login({ onAutenticado, onIrRegistro }) {
  const [form, setForm] = useState({ correo: '', password: '' })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const cambiar = (campo) => (e) => {
    const nuevo = { ...form, [campo]: e.target.value }
    setForm(nuevo)
    setErrorGeneral('')
    if (intentado) setErrores(validarLogin(nuevo))
  }

  async function enviar(e) {
    e.preventDefault()
    setIntentado(true)
    const errs = validarLogin(form)
    setErrores(errs)
    if (Object.keys(errs).length) return

    setEnviando(true)
    setErrorGeneral('')
    try {
      const { token, usuario } = await api.login({
        correo: form.correo.trim(),
        password: form.password,
      })
      onAutenticado(token, usuario)
    } catch (err) {
      if (err.campo) setErrores({ [err.campo]: err.message })
      else setErrorGeneral(err.message)
      setEnviando(false)
    }
  }

  return (
    <AuthLayout>
      <p className="auth-eyebrow">Bienvenido de nuevo</p>
      <h1>Inicia sesión</h1>
      <p className="auth-sub">Accede a tu espacio de gestión.</p>

      <form onSubmit={enviar} noValidate>
        <Campo
          id="correo"
          etiqueta="Correo electrónico"
          Icono={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nombre@empresa.com"
          autoFocus={enfocar}
          value={form.correo}
          onChange={cambiar('correo')}
          error={errores.correo}
        />
        <Campo
          id="password"
          etiqueta="Contraseña"
          Icono={Lock}
          type="password"
          autoComplete="current-password"
          placeholder="Mínimo 6 caracteres"
          value={form.password}
          onChange={cambiar('password')}
          error={errores.password}
        />

        {errorGeneral && (
          <p className="auth-error" role="alert">
            {errorGeneral}
          </p>
        )}

        <button type="submit" className="btn-auth" disabled={enviando}>
          <span>{enviando ? 'Entrando...' : 'Entrar a Almacena'}</span>
          <ChevronRight size={18} />
        </button>
      </form>

      <p className="auth-pie">
        ¿Aún no tienes una cuenta?{' '}
        <button type="button" className="enlace-auth" onClick={onIrRegistro}>
          Crear usuario
        </button>
      </p>
    </AuthLayout>
  )
}