import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool } from './db.js'
import authRouter, { requireAuth } from './auth.js'
import { esCorreo } from './validar.js'
import productosRouter, { DIR_UPLOADS } from './productos.js'
import ventasRouter from './ventas.js'

const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN }))
app.use(express.json({ limit: '10kb' }))

// Imagenes de productos (nombres aleatorios; solo se guardan JPG, PNG y WebP)
app.use(
  '/uploads',
  express.static(DIR_UPLOADS, {
    maxAge: '7d',
    index: false,
    setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff'),
  })
)

// Rutas publicas: registro y login. Todo lo demas exige sesion.
app.use('/api/auth', authRouter)
app.use('/api', requireAuth)
app.use('/api/tiendas/:tiendaId/productos', productosRouter)
app.use('/api/tiendas/:tiendaId/ventas', ventasRouter)

// ---------- Perfil ----------
app.put('/api/perfil', async (req, res) => {
  const { nombre, correo, cargo } = req.body ?? {}
  const correoLimpio = typeof correo === 'string' ? correo.trim().toLowerCase() : ''

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio', campo: 'nombre' })
  }
  if (!correoLimpio) {
    return res.status(400).json({ error: 'El correo es obligatorio', campo: 'correo' })
  }
  if (!esCorreo(correoLimpio)) {
    return res.status(400).json({ error: 'Ingresa un correo válido', campo: 'correo' })
  }
  const cargoLimpio = typeof cargo === 'string' ? cargo.trim().slice(0, 80) : ''

  try {
    await pool.query(
      'UPDATE admins SET nombre = ?, correo = ?, cargo = ? WHERE id = ?',
      [nombre.trim(), correoLimpio, cargoLimpio || 'Administrador', req.adminId]
    )
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Este correo ya está registrado', campo: 'correo' })
    }
    throw err
  }
  const [rows] = await pool.query(
    'SELECT id, nombre, correo, cargo FROM admins WHERE id = ?',
    [req.adminId]
  )
  res.json(rows[0])
})

// ---------- Tiendas ----------
app.get('/api/tiendas', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion FROM tiendas WHERE admin_id = ? ORDER BY id',
    [req.adminId]
  )
  res.json(rows)
})

app.post('/api/tiendas', async (req, res) => {
  const { nombre, descripcion } = req.body ?? {}
  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre de la tienda es obligatorio' })
  }
  const [result] = await pool.query(
    'INSERT INTO tiendas (admin_id, nombre, descripcion) VALUES (?, ?, ?)',
    [req.adminId, nombre.trim(), descripcion?.trim() || null]
  )
  res.status(201).json({
    id: result.insertId,
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null,
  })
})

// ---------- Resumen del panel ----------
app.get('/api/tiendas/:id/resumen', async (req, res) => {
  const tiendaId = Number(req.params.id)
  const dias = Math.min(Math.max(parseInt(req.query.dias, 10) || 7, 1), 90)

  const [tiendas] = await pool.query(
    'SELECT id, objetivo_diario FROM tiendas WHERE id = ? AND admin_id = ?',
    [tiendaId, req.adminId]
  )
  if (!tiendas.length) return res.status(404).json({ error: 'Tienda no encontrada' })
  const objetivo = Number(tiendas[0].objetivo_diario)

  const [[prod]] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(stock), 0) AS unidades,
            COALESCE(SUM(stock * precio_venta), 0) AS valor,
            COALESCE(SUM(stock < stock_minimo), 0) AS bajos
     FROM productos WHERE tienda_id = ?`,
    [tiendaId]
  )

  const [[ventas]] = await pool.query(
    `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS facturas
     FROM ventas
     WHERE tienda_id = ? AND creada_en >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
    [tiendaId]
  )

  const [filasDias] = await pool.query(
    `SELECT DATE_FORMAT(creada_en, '%Y-%m-%d') AS dia, SUM(total) AS total
     FROM ventas
     WHERE tienda_id = ? AND creada_en >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY dia`,
    [tiendaId, dias - 1]
  )
  const porDia = new Map(filasDias.map((f) => [f.dia, Number(f.total)]))
  const actividad = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const fecha = d.toLocaleDateString('en-CA') // YYYY-MM-DD
    actividad.push({ fecha, ventas: porDia.get(fecha) || 0, objetivo })
  }

  const [alertas] = await pool.query(
    `SELECT id, nombre, stock, stock_minimo, imagen
     FROM productos
     WHERE tienda_id = ? AND stock < stock_minimo
     ORDER BY stock / stock_minimo ASC
     LIMIT 3`,
    [tiendaId]
  )

  const [recientes] = await pool.query(
    `SELECT id, nombre, sku, stock, stock_minimo, precio_venta, imagen
     FROM productos
     WHERE tienda_id = ?
     ORDER BY creada_en DESC, id DESC
     LIMIT 5`,
    [tiendaId]
  )

  res.json({
    valorInventario: Number(prod.valor),
    totalProductos: Number(prod.total),
    unidades: Number(prod.unidades),
    stockBajo: Number(prod.bajos),
    ventasMes: Number(ventas.total),
    facturasMes: Number(ventas.facturas),
    actividad,
        alertas: alertas.map((a) => ({ ...a, imagen: a.imagen ? `/uploads/${a.imagen}` : null })),
    recientes: recientes.map((p) => ({
      ...p,
      precio_venta: Number(p.precio_venta),
      imagen: p.imagen ? `/uploads/${p.imagen}` : null,
    })),
  })
})

// ---------- Errores ----------
app.use((err, req, res, next) => {
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Ese valor ya existe, usa otro' })
  }
  console.error(err)
  res.status(500).json({ error: 'Error del servidor' })
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`API en http://localhost:${port}`))