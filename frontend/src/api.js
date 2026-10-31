const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const CLAVE_TOKEN = 'token'

// localStorage puede fallar (modo privado, bloqueado): siempre dentro de try/catch
export const almacen = {
  leer: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  escribir: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* sin almacenamiento: la sesión dura solo hasta recargar */
    }
  },
  borrar: (k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* nada que hacer */
    }
  },
}

export const sesion = {
  token: () => almacen.leer(CLAVE_TOKEN),
  guardar: (t) => almacen.escribir(CLAVE_TOKEN, t),
  borrar: () => almacen.borrar(CLAVE_TOKEN),
}

export class ApiError extends Error {
  constructor(mensaje, status, campo, datos = {}) {
    super(mensaje)
    this.status = status
    this.campo = campo
    this.datos = datos // cuerpo completo de la respuesta (por ejemplo, stock disponible)
  }
}

// App registra aquí qué hacer cuando el servidor rechaza el token
let alExpirar = () => {}
export const onSesionExpirada = (fn) => {
  alExpirar = fn
}

async function req(path, options = {}) {
  const token = sesion.token()
  let res
  try {
    res = await fetch(BASE + path, {
      ...options,
      headers: {
        // Con FormData (subida de imagen) el navegador pone su propio Content-Type
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const esAuth = path.startsWith('/auth/login') || path.startsWith('/auth/registro')
    if (res.status === 401 && token && !esAuth) alExpirar()
    throw new ApiError(data.error || 'Error del servidor', res.status, data.campo, data)
  }
  return data
}

const json = (method, body) => ({ method, body: JSON.stringify(body) })

export const api = {
  login: (d) => req('/auth/login', json('POST', d)),
  registro: (d) => req('/auth/registro', json('POST', d)),
  me: () => req('/auth/me'),
  guardarPerfil: (d) => req('/perfil', json('PUT', d)),
  tiendas: () => req('/tiendas'),
  crearTienda: (d) => req('/tiendas', json('POST', d)),
  resumen: (id, dias) => req(`/tiendas/${id}/resumen?dias=${dias}`),
  productos: (tiendaId, q) =>
    req(`/tiendas/${tiendaId}/productos${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  crearProducto: (tiendaId, formData) =>
    req(`/tiendas/${tiendaId}/productos`, { method: 'POST', body: formData }),
  eliminarProducto: (tiendaId, id) =>
    req(`/tiendas/${tiendaId}/productos/${id}`, { method: 'DELETE' }),
  ventas: (tiendaId, { q = '', limite = 20 } = {}) =>
    req(`/tiendas/${tiendaId}/ventas?limite=${limite}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  venta: (tiendaId, id) => req(`/tiendas/${tiendaId}/ventas/${id}`),
  crearVenta: (tiendaId, datos) => req(`/tiendas/${tiendaId}/ventas`, json('POST', datos)),
}

// Las imágenes las sirve el backend: la ruta relativa se completa con su dirección
export const urlArchivo = (ruta) => (ruta ? BASE.replace(/\/api$/, '') + ruta : null)