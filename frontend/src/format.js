const MONEDA = 'COP' // cambia a 'COP' si prefieres pesos colombianos

export const dinero = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: MONEDA }).format(n)

export const iniciales = (texto = '') =>
  texto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

export const saludo = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export const etiquetaDia = (fecha, dias) => {
  const d = new Date(fecha + 'T00:00:00')
  if (dias <= 7) {
    const s = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export const METODOS = [
  { id: 'efectivo', texto: 'Efectivo' },
  { id: 'tarjeta', texto: 'Tarjeta' },
  { id: 'transferencia', texto: 'Transferencia' },
]
export const textoMetodo = (id) => METODOS.find((m) => m.id === id)?.texto ?? id

export const fechaCorta = (f) => new Date(f).toLocaleDateString('es-ES')
export const fechaLarga = (f) =>
  new Date(f).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })

// Mismo cálculo que el servidor, en céntimos para no arrastrar errores de decimales
export const calcularTotales = (items, ivaPct) => {
  const subtotal = items.reduce((s, i) => s + Math.round(i.precio_venta * 100) * i.cantidad, 0)
  const iva = Math.floor((subtotal * ivaPct + 50) / 100)
  return { subtotal: subtotal / 100, iva: iva / 100, total: (subtotal + iva) / 100 }
}

// Un producto está en stock bajo cuando su stock es menor al mínimo
export const stockBajo = (p) => p.stock < p.stock_minimo

// "12,90" o "12.90" -> "12.90". Devuelve null si no es un importe válido
export const normalizarMonto = (texto) => {
  const t = texto.trim().replace(',', '.')
  return /^\d{1,10}(\.\d{1,2})?$/.test(t) ? t : null
}