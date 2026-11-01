export default function PrimaryButton({ children, loading, disabled, ...rest }) {
  return (
    <button type="submit" className="auth-v2__submit" disabled={disabled || loading} {...rest}>
      <span>{children}</span>
      <span className="auth-v2__submit-chip">
        {loading ? <span className="auth-v2__spinner" aria-hidden="true" /> : <span aria-hidden="true">→</span>}
      </span>
    </button>
  );
}
