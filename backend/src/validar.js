const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const esCorreo = (v) => typeof v === 'string' && v.length <= 160 && CORREO.test(v)

// Requisitos de contrasena: 6+ caracteres, mayuscula, minuscula, numero y simbolo
export function errorPassword(p) {
  if (typeof p !== 'string' || p.length === 0) return 'La contraseña es obligatoria'
  if (p.length < 6) return 'La contraseña debe tener mínimo 6 caracteres'
  if (p.length > 72) return 'La contraseña no puede superar 72 caracteres'
  if (!/\p{Lu}/u.test(p)) return 'Debe incluir al menos una mayúscula'
  if (!/\p{Ll}/u.test(p)) return 'Debe incluir al menos una minúscula'
  if (!/\d/.test(p)) return 'Debe incluir al menos un número'
  if (!/[^\p{L}\p{N}\s]/u.test(p)) return 'Debe incluir al menos un símbolo (por ejemplo ! @ # $ %)'
  return null
}