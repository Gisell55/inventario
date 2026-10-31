import { Router } from 'express'
import multer from 'multer'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'

export const DIR_UPLOADS = fileURLToPath(new URL('../uploads', import.meta.url))
fs.mkdirSync(DIR_UPLOADS, { recursive: true })

const MAX_IMAGEN = 2 * 1024 * 1024 // 2 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGEN, files: 1, fields: 20 },
})

// Se lee el contenido real del archivo, no se confía en el nombre ni en el tipo que declara el navegador
function tipoImagen(buf) {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'webp'
  }
  return null
}

function borrarImagen(nombre) {
  if (!nombre) return
  fs.promises.unlink(path.join(DIR_UPLOADS, path.basename(nombre))).catch(() => {})
}

const falla = (res, estado, error, campo) => res.status(estado).json({ error, campo })

const aProducto = (p) => ({
  id: p.id,
  nombre: p.nombre,
  sku: p.sku,
  precio_compra: Number(p.precio_compra),
  precio_venta: Number(p.precio_venta),
  precio_mayorista: Number(p.precio_mayorista),
  stock: p.stock,
  stock_minimo: p.stock_minimo,
  imagen: p.imagen ? `/uploads/${p.imagen}` : null,
})

// Valida y normaliza los campos del formulario. Devuelve { error, campo } o { datos }
function leerCampos(body = {}) {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  if (!nombre) return { error: 'El nombre es obligatorio', campo: 'nombre' }
  if (nombre.length > 160) return { error: 'El nombre no puede superar 160 caracteres', campo: 'nombre' }

  const sku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : ''
  if (!sku) return { error: 'El SKU es obligatorio', campo: 'sku' }
  if (sku.length > 40) return { error: 'El SKU no puede superar 40 caracteres', campo: 'sku' }

  const dinero = (valor, campo, etiqueta) => {
    if (typeof valor !== 'string' || valor.trim() === '') return { error: `${etiqueta} es obligatorio`, campo }
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(valor.trim())) {
      return { error: `${etiqueta} debe ser un número válido (máx. 2 decimales)`, campo }
    }
    return { valor: Number(valor.trim()) }
  }
  const entero = (valor, campo, etiqueta, minimo) => {
    if (typeof valor !== 'string' || valor.trim() === '') return { error: `${etiqueta} es obligatorio`, campo }
    if (!/^\d{1,7}$/.test(valor.trim())) return { error: `${etiqueta} debe ser un número entero`, campo }
    const n = Number(valor.trim())
    if (n < minimo) return { error: `${etiqueta} debe ser ${minimo} o más`, campo }
    return { valor: n }
  }

  const compra = dinero(body.precio_compra, 'precio_compra', 'El precio de compra')
  if (compra.error) return compra
  const venta = dinero(body.precio_venta, 'precio_venta', 'El precio de venta')
  if (venta.error) return venta
  const mayorista = dinero(body.precio_mayorista, 'precio_mayorista', 'El precio mayorista')
  if (mayorista.error) return mayorista
  const stock = entero(body.stock, 'stock', 'El stock', 0)
  if (stock.error) return stock
  // Opcional en el formulario: si no llega se usa 10
  const minimo = entero(body.stock_minimo ?? '10', 'stock_minimo', 'El stock mínimo', 1)
  if (minimo.error) return minimo

  return {
    datos: {
      nombre,
      sku,
      precio_compra: compra.valor,
      precio_venta: venta.valor,
      precio_mayorista: mayorista.valor,
      stock: stock.valor,
      stock_minimo: minimo.valor,
    },
  }
}

// Convierte los errores de multer en respuestas claras
function subida(req, res, next) {
  upload.single('imagen')(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') return falla(res, 400, 'La imagen no puede superar 2 MB', 'imagen')
    if (err instanceof multer.MulterError) return falla(res, 400, 'No se pudo leer el formulario', 'imagen')
    next(err)
  })
}

const router = Router({ mergeParams: true })

// Solo se puede trabajar con tiendas del usuario con sesión
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

router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''

  const [[stats]] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(stock), 0) AS unidades,
            COALESCE(SUM(stock * precio_venta), 0) AS valor
     FROM productos WHERE tienda_id = ?`,
    [req.tiendaId]
  )

  const params = [req.tiendaId]
  let filtro = ''
  if (q) {
    // '!' como escape para que % y _ escritos por el usuario se busquen literalmente
    const patron = `%${q.replace(/[!%_]/g, '!$&')}%`
    filtro = " AND (nombre LIKE ? ESCAPE '!' OR sku LIKE ? ESCAPE '!')"
    params.push(patron, patron)
  }
  const [rows] = await pool.query(
    `SELECT id, nombre, sku, precio_compra, precio_venta, precio_mayorista, stock, stock_minimo, imagen
     FROM productos WHERE tienda_id = ?${filtro}
     ORDER BY creada_en DESC, id DESC
     LIMIT 500`,
    params
  )

  res.json({
    productos: rows.map(aProducto),
    total: Number(stats.total),
    unidades: Number(stats.unidades),
    valor: Number(stats.valor),
  })
})

router.post('/', subida, async (req, res) => {
  const { error, campo, datos } = leerCampos(req.body)
  if (error) return falla(res, 400, error, campo)

  let archivo = null
  if (req.file) {
    const tipo = tipoImagen(req.file.buffer)
    if (!tipo) return falla(res, 400, 'La imagen debe ser JPG, PNG o WebP', 'imagen')
    archivo = `${crypto.randomUUID()}.${tipo}`
    await fs.promises.writeFile(path.join(DIR_UPLOADS, archivo), req.file.buffer)
  }

  try {
    const [r] = await pool.query(
      `INSERT INTO productos
         (tienda_id, nombre, sku, precio_compra, precio_venta, precio_mayorista, stock, stock_minimo, imagen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tiendaId,
        datos.nombre,
        datos.sku,
        datos.precio_compra,
        datos.precio_venta,
        datos.precio_mayorista,
        datos.stock,
        datos.stock_minimo,
        archivo,
      ]
    )
    res.status(201).json(aProducto({ id: r.insertId, ...datos, imagen: archivo }))
  } catch (err) {
    borrarImagen(archivo)
    if (err.code === 'ER_DUP_ENTRY') {
      return falla(res, 409, 'Ya existe un producto con ese SKU en esta tienda', 'sku')
    }
    throw err
  }
})

router.delete('/:productoId', async (req, res) => {
  const productoId = Number(req.params.productoId)
  if (!Number.isInteger(productoId)) return falla(res, 404, 'Producto no encontrado')

  const [rows] = await pool.query('SELECT imagen FROM productos WHERE id = ? AND tienda_id = ?', [
    productoId,
    req.tiendaId,
  ])
  if (!rows.length) return falla(res, 404, 'Producto no encontrado')

  await pool.query('DELETE FROM productos WHERE id = ? AND tienda_id = ?', [productoId, req.tiendaId])
  borrarImagen(rows[0].imagen)
  res.status(204).end()
})

export default router