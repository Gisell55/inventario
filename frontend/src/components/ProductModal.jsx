import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import Modal from './Modal.jsx'
import { api } from '../api.js'
import { normalizarMonto } from '../format.js'

const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGEN = 2 * 1024 * 1024
const enfocar = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

const VACIO = {
  nombre: '',
  sku: '',
  stock: '',
  precio_compra: '',
  precio_venta: '',
  precio_mayorista: '',
  stock_minimo: '10',
}

function validar(f) {
  const e = {}
  if (!f.nombre.trim()) e.nombre = 'El nombre es obligatorio'
  else if (f.nombre.trim().length > 160) e.nombre = 'Máximo 160 caracteres'
  if (!f.sku.trim()) e.sku = 'El SKU es obligatorio'
  else if (f.sku.trim().length > 40) e.sku = 'Máximo 40 caracteres'

  const precios = [
    ['precio_compra', 'precio de compra'],
    ['precio_venta', 'precio de venta'],
    ['precio_mayorista', 'precio mayorista'],
  ]
  for (const [campo, nombre] of precios) {
    if (!f[campo].trim()) e[campo] = `Ingresa el ${nombre}`
    else if (!normalizarMonto(f[campo])) e[campo] = 'Importe no válido, por ejemplo 12,90'
  }

  if (!f.stock.trim()) e.stock = 'Ingresa el stock'
  else if (!/^\d{1,7}$/.test(f.stock.trim())) e.stock = 'Debe ser un número entero (0 o más)'
  if (!f.stock_minimo.trim()) e.stock_minimo = 'Ingresa el stock mínimo'
  else if (!/^\d{1,7}$/.test(f.stock_minimo.trim()) || Number(f.stock_minimo) < 1) {
    e.stock_minimo = 'Debe ser un número entero (1 o más)'
  }
  return e
}

function CampoForm({ id, etiqueta, error, ayuda, ancho, ...props }) {
  return (
    <label htmlFor={id} className={ancho ? 'ancho-total' : ''}>
      {etiqueta}
      <input id={id} name={id} aria-invalid={error ? 'true' : 'false'} {...props} />
      {error ? (
        <small className="campo-error" role="alert">
          {error}
        </small>
      ) : (
        ayuda && <small className="ayuda">{ayuda}</small>
      )}
    </label>
  )
}

export default function ProductModal({ tiendaId, onCreado, onClose }) {
  const [form, setForm] = useState(VACIO)
  const [archivo, setArchivo] = useState(null)
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const inputArchivo = useRef(null)

  // Vista previa de la imagen elegida (se libera al cambiarla o cerrar)
  const vista = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])
  useEffect(() => {
    return () => {
      if (vista) URL.revokeObjectURL(vista)
    }
  }, [vista])

  const cambiar = (campo) => (e) => {
    setForm({ ...form, [campo]: e.target.value })
    if (errores[campo]) setErrores({ ...errores, [campo]: undefined })
    setErrorGeneral('')
  }

  function elegirImagen(e) {
    const f = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!f) return
    if (!TIPOS.includes(f.type)) {
      setErrores((x) => ({ ...x, imagen: 'La imagen debe ser JPG, PNG o WebP' }))
      return
    }
    if (f.size > MAX_IMAGEN) {
      setErrores((x) => ({ ...x, imagen: 'La imagen no puede superar 2 MB' }))
      return
    }
    setErrores((x) => ({ ...x, imagen: undefined }))
    setArchivo(f)
  }

  async function enviar(e) {
    e.preventDefault()
    const errs = validar(form)
    if (Object.keys(errs).length) {
      setErrores({ ...errs, imagen: errores.imagen })
      return
    }

    const datos = new FormData()
    datos.append('nombre', form.nombre.trim())
    datos.append('sku', form.sku.trim())
    datos.append('precio_compra', normalizarMonto(form.precio_compra))
    datos.append('precio_venta', normalizarMonto(form.precio_venta))
    datos.append('precio_mayorista', normalizarMonto(form.precio_mayorista))
    datos.append('stock', form.stock.trim())
    datos.append('stock_minimo', form.stock_minimo.trim())
    if (archivo) datos.append('imagen', archivo)

    setEnviando(true)
    setErrorGeneral('')
    try {
      onCreado(await api.crearProducto(tiendaId, datos))
    } catch (err) {
      if (err.campo) setErrores({ [err.campo]: err.message })
      else setErrorGeneral(err.message)
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Cargar producto" onClose={onClose} ancho>
      <form onSubmit={enviar} noValidate className="formulario">
        <div className="subida">
          <div className="subida-vista">
            {vista ? <img src={vista} alt="Vista previa del producto" /> : <ImagePlus size={28} />}
          </div>
          <div className="subida-texto">
            <strong>Imagen del producto</strong>
            <small>JPG, PNG o WebP, máximo 2 MB</small>
            <div className="subida-botones">
              <button
                type="button"
                className="btn btn-claro btn-chico"
                onClick={() => inputArchivo.current?.click()}
              >
                {archivo ? 'Cambiar imagen' : 'Cargar imagen'}
              </button>
              {archivo && (
                <button type="button" className="enlace" onClick={() => setArchivo(null)}>
                  Quitar
                </button>
              )}
            </div>
            {errores.imagen && (
              <small className="campo-error" role="alert">
                {errores.imagen}
              </small>
            )}
          </div>
          <input
            ref={inputArchivo}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            aria-label="Archivo de imagen"
            onChange={elegirImagen}
          />
        </div>

        <div className="form-grid">
          <CampoForm
            id="nombre"
            etiqueta="Nombre"
            ancho
            placeholder="Ej. Aceite de oliva virgen extra"
            autoFocus={enfocar}
            value={form.nombre}
            onChange={cambiar('nombre')}
            error={errores.nombre}
          />
          <CampoForm
            id="sku"
            etiqueta="SKU"
            placeholder="Ej. ALI-00124"
            value={form.sku}
            onChange={cambiar('sku')}
            error={errores.sku}
          />
          <CampoForm
            id="stock"
            etiqueta="Stock"
            inputMode="numeric"
            placeholder="0"
            value={form.stock}
            onChange={cambiar('stock')}
            error={errores.stock}
          />
          <CampoForm
            id="precio_compra"
            etiqueta="Precio de compra"
            inputMode="decimal"
            placeholder="0,00"
            value={form.precio_compra}
            onChange={cambiar('precio_compra')}
            error={errores.precio_compra}
          />
          <CampoForm
            id="precio_venta"
            etiqueta="Precio de venta"
            inputMode="decimal"
            placeholder="0,00"
            value={form.precio_venta}
            onChange={cambiar('precio_venta')}
            error={errores.precio_venta}
          />
          <CampoForm
            id="precio_mayorista"
            etiqueta="Precio mayorista"
            inputMode="decimal"
            placeholder="0,00"
            value={form.precio_mayorista}
            onChange={cambiar('precio_mayorista')}
            error={errores.precio_mayorista}
          />
          <CampoForm
            id="stock_minimo"
            etiqueta="Stock mínimo"
            inputMode="numeric"
            placeholder="10"
            ayuda="Se marca como stock bajo por debajo de este número"
            value={form.stock_minimo}
            onChange={cambiar('stock_minimo')}
            error={errores.stock_minimo}
          />
        </div>

        {errorGeneral && <p className="error">{errorGeneral}</p>}

        <div className="acciones fin">
          <button type="button" className="btn btn-claro" onClick={onClose} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primario" disabled={enviando}>
            {enviando ? 'Guardando...' : 'Guardar producto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}