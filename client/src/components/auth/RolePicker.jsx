export default function RolePicker({ label, roles, value, onChange, name = 'role' }) {
  const labelId = `${name}-group-label`;

  return (
    <div className="auth-v2__rolegroup">
      <span className="auth-v2__label" id={labelId}>
        {label}
      </span>
      <div className="auth-v2__rolegrid" role="radiogroup" aria-labelledby={labelId}>
        {roles.map((r) => (
          <div className="auth-v2__role-option" key={r.key}>
            <input
              type="radio"
              id={`${name}-${r.key}`}
              name={name}
              value={r.key}
              checked={value === r.key}
              onChange={() => onChange(r.key)}
              className="sr-only"
            />
            <label htmlFor={`${name}-${r.key}`} className="auth-v2__role-card">
              <span className="auth-v2__role-badge" aria-hidden="true">
                {r.mono}
              </span>
              <span className="auth-v2__role-text">
                <span className="auth-v2__role-title">{r.label}</span>
                <span className="auth-v2__role-sub">{r.sub}</span>
              </span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
