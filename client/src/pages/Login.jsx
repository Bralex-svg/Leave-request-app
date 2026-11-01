import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import RolePicker from '../components/auth/RolePicker';
import TextField from '../components/auth/TextField';
import PasswordField from '../components/auth/PasswordField';
import PrimaryButton from '../components/auth/PrimaryButton';
import { ROLE_HOME, ROLE_OPTIONS } from '../lib/roles';

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = {};
    if (!email.trim()) errors.email = 'Enter your staff email.';
    else if (!email.includes('@')) errors.email = 'That doesn’t look like a valid email address.';
    if (!password.trim()) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password, role);
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setFormError(err.message);
      if (err.actualRole) setRole(err.actualRole);
    } finally {
      setSubmitting(false);
    }
  }

  const roleLabel = ROLE_OPTIONS.find((r) => r.key === role)?.label || '';
  const roleTitle = roleLabel.replace(' / Admin', ' Admin').replace('Head of Dept.', 'Head of Dept');

  return (
    <AuthLayout
      headingPrefix="Every day off,"
      headingEm="accounted for."
      lede="Request, approve and track staff leave in one place, from submission to final HR confirmation."
    >
      <form onSubmit={handleSubmit} noValidate>
        <span className="auth-v2__eyebrow">{greetingForNow()}</span>
        <h2 className="auth-v2__heading">Welcome back.</h2>
        <p className="auth-v2__subtext">Choose your role and sign in with your staff email.</p>

        <div className="auth-v2__fields">
          <RolePicker label="Sign in as" roles={ROLE_OPTIONS} value={role} onChange={setRole} />

          <TextField
            id="login-email"
            label="Staff email"
            type="email"
            autoComplete="email"
            placeholder="name@organisation.org"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((f) => ({ ...f, email: null }));
              setFormError(null);
            }}
            error={fieldErrors.email}
          />

          <PasswordField
            id="login-password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((f) => ({ ...f, password: null }));
              setFormError(null);
            }}
            error={fieldErrors.password}
            labelRight={
              <Link to="/forgot-password" className="auth-v2__forgot">
                Forgot password?
              </Link>
            }
          />
        </div>

        {formError && (
          <div className="auth-v2__form-error" role="alert">
            {formError}
          </div>
        )}

        <div className="auth-v2__actions">
          <PrimaryButton loading={submitting}>Continue as {roleTitle}</PrimaryButton>
          <p className="auth-v2__switch">
            New organisation? <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
