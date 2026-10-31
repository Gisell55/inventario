import { Router } from 'express'
import { pool } from './db.js'

export const IVA_PORCENTAJE = 21
const METODOS = ['efectivo', 'tarjeta', 'transferencia']
const MAX_LINEAS = 100
const MAX_CANTIDAD = 99999
const MAX_TOTAL_CENTIMOS = 900_000_000_000 // 9.000.000.000,00 (cabe en DECIMAL(12,2))

const falla = (res, estado, error, campo, extra = {}) =>
  res.status(estado).json({ error, campo, ...extra })

// Error esperado dentro de la transaccion: se responde y se deshacen los cambios
class Rechazo extends Error {
  constructor(estado, mensaje, campo, extra) {
    super(mensaje)
    this.estado = estado
    this.campo = campo
    this.extra = extra
  }
}

const numeroFactura = (n) => `FAC-${String(n).padStart(6, '0')}`
const centimos = (valor) => Math.round(Number(valor) * 100)
const decimal = (cent) => (cent / 100).toFixed(2)

const aVenta = (v) => ({
  id: v.id,
  numero: v.numero,
  factura: numeroFactura(v.numero),
  cliente: v.cliente,
  documento: v.documento,
  metodo_pago: v.metodo_pago,
  subtotal: Number(v.subtotal),
  iva_porcentaje: Number(v.iva_porcentaje),
  iva: Number(v.iva),
  total: Number(v.total),
  fecha: v.creada_en,
})

// Valida el cuerpo de la venta. Devuelve { error, campo } o { datos }
function leerVenta(body = {}) {
  const cliente = typeof body.cliente === 'string' ? body.cliente.trim() : ''
  if (cliente.length > 120) return { error: 'El nombre del cliente no puede superar 120 caracteres', campo: 'cliente' }

  const documento = typeof body.documento === 'string' ? body.documento.trim() : ''
  if (documento && !/^[A-Za-z0-9][A-Za-z0-9 .\-/]{0,29}$/.test(documento)) {
    return {
      error: 'El documento solo admite letras, números, espacios, puntos y guiones (máx. 30)',
      campo: 'documento',
    }
  }

  if (!METODOS.includes(body.metodo_pago)) {
    return { error: 'Elige un método de pago válido', campo: 'metodo_pago' }
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return { error: 'Añade al menos un producto a la factura', campo: 'items' }
  }
  if (body.items.length > MAX_LINEAS) {
    return { error: `Una factura admite hasta ${MAX_LINEAS} productos distintos`, campo: 'items' }
  }

  // Si un producto llega repetido se suman sus cantidades
  const porProducto = new Map()
  for (const it of body.items) {
    const id = it?.producto_id
    const cantidad = it?.cantidad
    if (!Number.isInteger(id) || id <= 0) return { error: 'Producto no válido', campo: 'items' }
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
      return { error: `La cantidad debe ser un entero entre 1 y ${MAX_CANTIDAD}`, campo: 'items' }
    }
    porProducto.set(id, (porProducto.get(id) || 0) + cantidad)
  }

  return {
    datos: {
      cliente: cliente || 'Cliente general',
      documento: documento || null,
      metodo_pago: body.metodo_pago,
      // Orden fijo por id: los productos se bloquean siempre en el mismo orden
      items: [...porProducto.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([producto_id, cantidad]) => ({ producto_id, cantidad })),
    },
  }
}

const router = Router({ mergeParams: true })

// Solo se puede trabajar con tiendas del usuario con sesion
router.use(async (req, res, next) => {
  const tiendaId = Number(req.params.tiendaId)
  if (!Number.isInteger(tiendaId)) return falla(res, 404, 'Tienda no encontrada')
  const [rows] = await pool.query('SELECT id FROM tiendas WHERE id = ? AND admin_id = ?', [
    tiendaId,
    req.adminId,
  ])
  if (!rows.length) return falla(res, 404, 'Tienda no encontrada')
  req.tiendaId = tiendaId
  next()
})

// Historial + siguiente numero de factura + totales del mes
router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
  const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 20, 1), 200)

  const [[tienda]] = await pool.query('SELECT siguiente_factura FROM tiendas WHERE id = ?', [
    req.tiendaId,
  ])
  const [[cuenta]] = await pool.query('SELECT COUNT(*) AS total FROM ventas WHERE tienda_id = ?', [
    req.tiendaId,
  ])
  const [[mes]] = await pool.query(
    `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS facturas
     FROM ventas
     WHERE tienda_id = ? AND creada_en >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
    [req.tiendaId]
  )

  const params = [req.tiendaId]
  let filtro = ''
  if (q) {
    // '!' como escape para que % y _ escritos por el usuario se busquen literalmente
    const patron = `%${q.replace(/[!%_]/g, '!$&')}%`
    filtro = " AND (cliente LIKE ? ESCAPE '!' OR CONCAT('FAC-', LPAD(numero, 6, '0')) LIKE ? ESCAPE '!')"
    params.push(patron, patron)
  }
  const [filas] = await pool.query(
    `SELECT id, numero, cliente, documento, metodo_pago, subtotal, iva_porcentaje, iva, total, creada_en
     FROM ventas WHERE tienda_id = ?${filtro}
     ORDER BY numero DESC, id DESC
     LIMIT ?`,
    [...params, limite]
  )

  res.json({
    siguiente: numeroFactura(tienda.siguiente_factura),
    iva: IVA_PORCENTAJE,
    total: Number(cuenta.total),
    mes: { total: Number(mes.total), facturas: Number(mes.facturas) },
    ventas: filas.map(aVenta),
  })
})

// Factura completa (para verla, imprimirla o guardarla en PDF)
router.get('/:ventaId', async (req, res) => {
  const ventaId = Number(req.params.ventaId)
  if (!Number.isInteger(ventaId)) return falla(res, 404, 'Factura no encontrada')

  const [filas] = await pool.query(
    `SELECT v.id, v.numero, v.cliente, v.documento, v.metodo_pago, v.subtotal, v.iva_porcentaje,
            v.iva, v.total, v.creada_en, t.nombre AS tienda
     FROM ventas v JOIN tiendas t ON t.id = v.tienda_id
     WHERE v.id = ? AND v.tienda_id = ?`,
    [ventaId, req.tiendaId]
  )
  if (!filas.length) return falla(res, 404, 'Factura no encontrada')

  const [items] = await pool.query(
    `SELECT nombre, sku, cantidad, precio_unitario, importe
     FROM venta_items WHERE venta_id = ? ORDER BY id`,
    [ventaId]
  )
  res.json({
    ...aVenta(filas[0]),
    tienda: filas[0].tienda,
    items: items.map((i) => ({
      nombre: i.nombre,
      sku: i.sku,
      cantidad: i.cantidad,
      precio_unitario: Number(i.precio_unitario),
      importe: Number(i.importe),
    })),
  })
})

// Registrar venta: todo ocurre en una sola transaccion. O se guarda la factura y se
// descuenta el stock, o no cambia nada.
router.post('/', async (req, res) => {
  const { error, campo, datos } = leerVenta(req.body)
  if (error) return falla(res, 400, error, campo)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // Bloquear la tienda garantiza una numeracion consecutiva sin huecos ni repetidos
    const [[tienda]] = await conn.query(
      'SELECT nombre, siguiente_factura FROM tiendas WHERE id = ? FOR UPDATE',
      [req.tiendaId]
    )
    const numero = tienda.siguiente_factura

    // Bloquear los productos evita vender el mismo stock dos veces a la vez
    const [productos] = await conn.query(
      `SELECT id, nombre, sku, precio_venta, stock
       FROM productos WHERE tienda_id = ? AND id IN (?) ORDER BY id FOR UPDATE`,
      [req.tiendaId, datos.items.map((i) => i.producto_id)]
    )
    const porId = new Map(productos.map((p) => [p.id, p]))

    const lineas = []
    let subtotal = 0
    for (const { producto_id, cantidad } of datos.items) {
      const p = porId.get(producto_id)
      if (!p) {
        throw new Rechazo(409, 'Uno de los productos ya no existe', 'items', { producto_id })
      }
      if (cantidad > p.stock) {
        const msg =
          p.stock === 0
            ? `«${p.nombre}» está agotado`
            : `Stock insuficiente de «${p.nombre}»: quedan ${p.stock} unidades`
        throw new Rechazo(409, msg, 'items', { producto_id, disponible: p.stock })
      }
      const precio = centimos(p.precio_venta)
      const importe = precio * cantidad
      subtotal += importe
      lineas.push({ producto_id, nombre: p.nombre, sku: p.sku, cantidad, precio, importe })
    }

    // IVA sobre la base, redondeado al centimo (la mitad hacia arriba)
    const iva = Math.floor((subtotal * IVA_PORCENTAJE + 50) / 100)
    const total = subtotal + iva
    if (total > MAX_TOTAL_CENTIMOS) {
      throw new Rechazo(400, 'El total de la factura es demasiado alto', 'items')
    }

    const [r] = await conn.query(
      `INSERT INTO ventas
         (tienda_id, numero, cliente, documento, metodo_pago, subtotal, iva_porcentaje, iva, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tiendaId,
        numero,
        datos.cliente,
        datos.documento,
        datos.metodo_pago,
        decimal(subtotal),
        IVA_PORCENTAJE,
        decimal(iva),
        decimal(total),
      ]
    )

    await conn.query(
      `INSERT INTO venta_items (venta_id, producto_id, nombre, sku, cantidad, precio_unitario, importe)
       VALUES ?`,
      [lineas.map((l) => [r.insertId, l.producto_id, l.nombre, l.sku, l.cantidad, decimal(l.precio), decimal(l.importe)])]
    )

    for (const l of lineas) {
      const [d] = await conn.query(
        'UPDATE productos SET stock = stock - ? WHERE id = ? AND tienda_id = ? AND stock >= ?',
        [l.cantidad, l.producto_id, req.tiendaId, l.cantidad]
      )
      if (d.affectedRows !== 1) {
        throw new Rechazo(409, `Stock insuficiente de «${l.nombre}»`, 'items', { producto_id: l.producto_id })
      }
    }

    await conn.query('UPDATE tiendas SET siguiente_factura = siguiente_factura + 1 WHERE id = ?', [
      req.tiendaId,
    ])
    const [[creada]] = await conn.query('SELECT creada_en FROM ventas WHERE id = ?', [r.insertId])

    await conn.commit()

    res.status(201).json({
      ...aVenta({
        id: r.insertId,
        numero,
        cliente: datos.cliente,
        documento: datos.documento,
        metodo_pago: datos.metodo_pago,
        subtotal: decimal(subtotal),
        iva_porcentaje: IVA_PORCENTAJE,
        iva: decimal(iva),
        total: decimal(total),
        creada_en: creada.creada_en,
      }),
      tienda: tienda.nombre,
      items: lineas.map((l) => ({
        nombre: l.nombre,
        sku: l.sku,
        cantidad: l.cantidad,
        precio_unitario: l.precio / 100,
        importe: l.importe / 100,
      })),
    })
  } catch (err) {
    await conn.rollback().catch(() => {})
    if (err instanceof Rechazo) return falla(res, err.estado, err.message, err.campo, err.extra)
    throw err
  } finally {
    conn.release()
  }
})

export default router