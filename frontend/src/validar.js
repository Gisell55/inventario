export const esCorreo = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 160

// Requisitos de contraseña (se muestran como chips en el registro)
export const REQUISITOS = [
  { id: 'largo', texto: '6 o más caracteres', cumple: (p) => p.length >= 6 },
  { id: 'mayus', texto: 'Mayúscula', cumple: (p) => /\p{Lu}/u.test(p) },
  { id: 'minus', texto: 'Minúscula', cumple: (p) => /\p{Ll}/u.test(p) },
  { id: 'num', texto: 'Número', cumple: (p) => /\d/.test(p) },
  { id: 'simbolo', texto: 'Símbolo', cumple: (p) => /[^\p{L}\p{N}\s]/u.test(p) },
]

export function errorPassword(p) {
  if (!p) return 'La contraseña es obligatoria'
  if (p.length < 6) return 'La contraseña debe tener mínimo 6 caracteres'
  if (p.length > 72) return 'La contraseña no puede superar 72 caracteres'
  if (!/\p{Lu}/u.test(p)) return 'Debe incluir al menos una mayúscula'
  if (!/\p{Ll}/u.test(p)) return 'Debe incluir al menos una minúscula'
  if (!/\d/.test(p)) return 'Debe incluir al menos un número'
  if (!/[^\p{L}\p{N}\s]/u.test(p)) return 'Debe incluir al menos un símbolo (por ejemplo ! @ # $ %)'
  return null
}

function errorCorreo(correo) {
  const c = correo.trim()
  if (!c) return 'El correo es obligatorio'
  if (!esCorreo(c)) return 'Ingresa un correo válido'
  return null
}

export function validarLogin({ correo, password }) {
  const e = {}
  const ec = errorCorreo(correo)
  if (ec) e.correo = ec
  if (!password) e.password = 'La contraseña es obligatoria'
  return e
}

export function validarRegistro({ nombre, correo, password, confirmar }) {
  const e = {}
  if (!nombre.trim()) e.nombre = 'El nombre es obligatorio'
  else if (nombre.trim().length < 2) e.nombre = 'El nombre es demasiado corto'
  const ec = errorCorreo(correo)
  if (ec) e.correo = ec
  const ep = errorPassword(password)
  if (ep) e.password = ep
  if (!confirmar) e.confirmar = 'Confirma tu contraseña'
  else if (confirmar !== password) e.confirmar = 'Las contraseñas no coinciden'
  return e
}