import { Check, Package } from 'lucide-react'

const VENTAJAS = [
  'Control de existencias en tiempo real',
  'Facturación rápida y profesional',
  'Reportes listos para descargar',
]

export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <aside className="auth-hero">
        <span className="auth-aro auth-aro-1" />
        <span className="auth-aro auth-aro-2" />
        <span className="auth-aro auth-aro-3" />

        <div className="auth-logo">
          <span className="logo-icono">
            <Package size={22} />
          </span>
          <span>Almacena</span>
        </div>

        <div className="auth-hero-texto">
          <p className="auth-eyebrow claro">Inventario bajo control</p>
          <h2>Gestiona tu negocio con claridad.</h2>
          <p className="auth-parrafo">
            Productos, facturación y reportes en un solo lugar, siempre organizados y listos
            para ayudarte a decidir.
          </p>
          <ul className="auth-ventajas">
            {VENTAJAS.map((v) => (
              <li key={v}>
                <Check size={15} /> {v}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-logo-movil">
          <span className="logo-icono">
            <Package size={20} />
          </span>
          <span>Almacena</span>
        </div>
        <div className="auth-tarjeta">{children}</div>
      </main>
    </div>
  )
}