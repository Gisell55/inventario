export default function Campo({ id, etiqueta, Icono, error, children, ...props }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <div className={'campo-caja' + (error ? ' con-error' : '')}>
        <Icono size={18} />
        <input
          id={id}
          name={id}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
      </div>
      {error && (
        <p className="campo-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
      {children}
    </div>
  )
}