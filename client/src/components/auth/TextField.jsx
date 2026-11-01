export default function TextField({ id, label, error, ...inputProps }) {
  return (
    <div className="auth-v2__field">
      <label className="auth-v2__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`auth-v2__input${error ? ' has-error' : ''}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <p className="auth-v2__field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
