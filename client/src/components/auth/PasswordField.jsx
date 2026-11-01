import { useState } from 'react';

export default function PasswordField({ id, label, labelRight, error, ...inputProps }) {
  const [show, setShow] = useState(false);

  return (
    <div className="auth-v2__field">
      <div className="auth-v2__label-row">
        <label className="auth-v2__label" htmlFor={id}>
          {label}
        </label>
        {labelRight}
      </div>
      <div className="auth-v2__pw-wrap">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={`auth-v2__input${error ? ' has-error' : ''}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        <button
          type="button"
          className="auth-v2__pw-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && (
        <p className="auth-v2__field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
