import { useState } from 'react'
import { ChevronRight, Lock, Mail, User } from 'lucide-react'
import AuthLayout from './AuthLayout.jsx'
import Campo from './Campo.jsx'
import { api } from '../api.js'
import { REQUISITOS, validarRegistro } from '../validar.js'

const enfocar = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

export default function Register({ onAutenticado, onIrLogin }) {
  const [form, setForm] = useState({ nombre: '', correo: '', password: '', confirmar: '' })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [intentado, setIntentado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const cambiar = (campo) => (e) => {
    const nuevo = { ...form, [campo]: e.target.value }
    setForm(nuevo)
    setErrorGeneral('')
    if (intentado) setErrores(validarRegistro(nuevo))
    else if (errores[campo]) setErrores({ ...errores, [campo]: undefined })
  }

  async function enviar(e) {
    e.preventDefault()
    setIntentado(true)
    const errs = validarRegistro(form)
    setErrores(errs)
    if (Object.keys(errs).length) return

    setEnviando(true)
    setErrorGeneral('')
    try {
      const { token, usuario } = await api.registro({
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        password: form.password,
        confirmar: form.confirmar,
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
      <p className="auth-eyebrow">Nueva cuenta</p>
      <h1>Crea tu usuario</h1>
      <p className="auth-sub">Completa tus datos para comenzar a usar Almacena.</p>

      <form onSubmit={enviar} noValidate>
        <Campo
          id="nombre"
          etiqueta="Nombre completo"
          Icono={User}
          autoComplete="name"
          placeholder="Ej. María López"
          autoFocus={enfocar}
          value={form.nombre}
          onChange={cambiar('nombre')}
          error={errores.nombre}
        />
        <Campo
          id="correo"
          etiqueta="Correo electrónico"
          Icono={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nombre@empresa.com"
          value={form.correo}
          onChange={cambiar('correo')}
          error={errores.correo}
        />
        <Campo
          id="password"
          etiqueta="Contraseña"
          Icono={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          value={form.password}
          onChange={cambiar('password')}
          error={errores.password}
        >
          {form.password && (
            <ul className="requisitos" aria-label="Requisitos de la contraseña">
              {REQUISITOS.map((r) => (
                <li key={r.id} className={r.cumple(form.password) ? 'cumple' : ''}>
                  {r.texto}
                </li>
              ))}
            </ul>
          )}
        </Campo>
        <Campo
          id="confirmar"
          etiqueta="Confirmar contraseña"
          Icono={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          value={form.confirmar}
          onChange={cambiar('confirmar')}
          error={errores.confirmar}
        />

        {errorGeneral && (
          <p className="auth-error" role="alert">
            {errorGeneral}
          </p>
        )}

        <button type="submit" className="btn-auth" disabled={enviando}>
          <span>{enviando ? 'Creando cuenta...' : 'Crear cuenta y entrar'}</span>
          <ChevronRight size={18} />
        </button>
      </form>

      <p className="auth-pie">
        ¿Ya tienes una cuenta?{' '}
        <button type="button" className="enlace-auth" onClick={onIrLogin}>
          Iniciar sesión
        </button>
      </p>
    </AuthLayout>
  )
}