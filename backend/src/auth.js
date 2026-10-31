import 'dotenv/config'
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from './db.js'
import { errorPassword, esCorreo } from './validar.js'

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Falta JWT_SECRET en .env (mínimo 32 caracteres)')
}
const SECRET = process.env.JWT_SECRET
const DURACION = '7d'

// Hash de relleno para que login tarde lo mismo exista o no el correo
const HASH_FALSO = bcrypt.hashSync('relleno-no-valido', 10)

const crearToken = (id) =>
  jwt.sign({}, SECRET, { subject: String(id), expiresIn: DURACION, algorithm: 'HS256' })

const publico = (a) => ({ id: a.id, nombre: a.nombre, correo: a.correo, cargo: a.cargo })

const falla = (res, estado, error, campo) => res.status(estado).json({ error, campo })

export async function requireAuth(req, res, next) {
  const cabecera = req.headers.authorization || ''
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null
  if (!token) return falla(res, 401, 'No has iniciado sesión')
  try {
    const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] })
    req.adminId = Number(payload.sub)
    next()
  } catch {
    falla(res, 401, 'Tu sesión expiró, inicia sesión de nuevo')
  }
}

const router = Router()

router.post('/registro', async (req, res) => {
  const { nombre, correo, password, confirmar } = req.body ?? {}

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return falla(res, 400, 'El nombre es obligatorio', 'nombre')
  }
  if (nombre.trim().length < 2 || nombre.trim().length > 120) {
    return falla(res, 400, 'El nombre debe tener entre 2 y 120 caracteres', 'nombre')
  }
  const correoLimpio = typeof correo === 'string' ? correo.trim().toLowerCase() : ''
  if (!correoLimpio) return falla(res, 400, 'El correo es obligatorio', 'correo')
  if (!esCorreo(correoLimpio)) return falla(res, 400, 'Ingresa un correo válido', 'correo')

  const errPass = errorPassword(password)
  if (errPass) return falla(res, 400, errPass, 'password')
  if (confirmar !== password) return falla(res, 400, 'Las contraseñas no coinciden', 'confirmar')

  const hash = await bcrypt.hash(password, 10)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [r] = await conn.query(
      'INSERT INTO admins (nombre, correo, password_hash, cargo) VALUES (?, ?, ?, ?)',
      [nombre.trim(), correoLimpio, hash, 'Administrador']
    )
    // Cada usuario nuevo empieza con una tienda para poder ver el panel
    await conn.query(
      'INSERT INTO tiendas (admin_id, nombre, descripcion) VALUES (?, ?, ?)',
      [r.insertId, 'Mi tienda', 'Tienda principal']
    )
    await conn.commit()
    res.status(201).json({
      token: crearToken(r.insertId),
      usuario: { id: r.insertId, nombre: nombre.trim(), correo: correoLimpio, cargo: 'Administrador' },
    })
  } catch (err) {
    await conn.rollback()
    if (err.code === 'ER_DUP_ENTRY') {
      return falla(res, 409, 'Este correo ya está registrado', 'correo')
    }
    throw err
  } finally {
    conn.release()
  }
})

router.post('/login', async (req, res) => {
  const { correo, password } = req.body ?? {}
  const correoLimpio = typeof correo === 'string' ? correo.trim().toLowerCase() : ''

  if (!correoLimpio) return falla(res, 400, 'El correo es obligatorio', 'correo')
  if (!esCorreo(correoLimpio)) return falla(res, 400, 'Ingresa un correo válido', 'correo')
  if (typeof password !== 'string' || !password) {
    return falla(res, 400, 'La contraseña es obligatoria', 'password')
  }

  const [rows] = await pool.query(
    'SELECT id, nombre, correo, cargo, password_hash FROM admins WHERE correo = ?',
    [correoLimpio]
  )
  const admin = rows[0]
  const ok = await bcrypt.compare(password.slice(0, 72), admin?.password_hash ?? HASH_FALSO)
  if (!admin || !ok) return falla(res, 401, 'Correo o contraseña incorrectos')

  res.json({ token: crearToken(admin.id), usuario: publico(admin) })
})

router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, correo, cargo FROM admins WHERE id = ?',
    [req.adminId]
  )
  if (!rows[0]) return falla(res, 401, 'Tu sesión ya no es válida')
  res.json(publico(rows[0]))
})

export default router