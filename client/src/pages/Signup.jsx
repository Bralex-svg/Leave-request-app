import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import TextField from '../components/auth/TextField';
import PasswordField from '../components/auth/PasswordField';
import PrimaryButton from '../components/auth/PrimaryButton';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [staffSize, setStaffSize] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = {};
    if (!orgName.trim()) errors.orgName = 'Enter your organisation name.';
    if (!adminName.trim()) errors.adminName = 'Enter your name.';
    if (!adminEmail.trim()) errors.adminEmail = 'Enter your work email.';
    else if (!adminEmail.includes('@')) errors.adminEmail = 'That doesn’t look like a valid email address.';
    if (!adminPassword || adminPassword.length < 8) errors.adminPassword = 'Password must be at least 8 characters.';
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      // Staff size is collected for the form's visual completeness but isn't
      // persisted yet — the signup API has no field for it.
      await signup(orgName.trim(), adminName.trim(), adminEmail.trim(), adminPassword);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      headingPrefix="Your whole team,"
      headingEm="on one calendar."
      lede="Set up your organisation in minutes. LeaveFlow handles requests, approvals and balances from day one."
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-v2__steps">
          <span className="auth-v2__eyebrow">Step 1 of 3</span>
          <span style={{ display: 'flex', gap: 4 }}>
            <span className="auth-v2__dash is-active" />
            <span className="auth-v2__dash" />
            <span className="auth-v2__dash" />
          </span>
        </div>
        <h2 className="auth-v2__heading">Create your organisation.</h2>
        <p className="auth-v2__subtext">You'll be the HR admin. Departments, staff and leave policies come next.</p>

        <div className="auth-v2__fields">
          <TextField
            id="signup-org"
            label="Organisation name"
            placeholder="Saint Anne's Hospital"
            autoComplete="organization"
            value={orgName}
            onChange={(e) => {
              setOrgName(e.target.value);
              setFieldErrors((f) => ({ ...f, orgName: null }));
              setFormError(null);
            }}
            error={fieldErrors.orgName}
          />

          <div className="auth-v2__row2">
            <TextField
              id="signup-name"
              label="Your name"
              placeholder="Mary Kipo"
              autoComplete="name"
              value={adminName}
              onChange={(e) => {
                setAdminName(e.target.value);
                setFieldErrors((f) => ({ ...f, adminName: null }));
                setFormError(null);
              }}
              error={fieldErrors.adminName}
            />
            <TextField
              id="signup-size"
              label="Staff size"
              placeholder="e.g. 250"
              value={staffSize}
              onChange={(e) => setStaffSize(e.target.value)}
            />
          </div>

          <TextField
            id="signup-email"
            label="Work email"
            type="email"
            autoComplete="email"
            placeholder="name@organisation.org"
            value={adminEmail}
            onChange={(e) => {
              setAdminEmail(e.target.value);
              setFieldErrors((f) => ({ ...f, adminEmail: null }));
              setFormError(null);
            }}
            error={fieldErrors.adminEmail}
          />

          <PasswordField
            id="signup-password"
            label="Password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={adminPassword}
            onChange={(e) => {
              setAdminPassword(e.target.value);
              setFieldErrors((f) => ({ ...f, adminPassword: null }));
              setFormError(null);
            }}
            error={fieldErrors.adminPassword}
          />
        </div>

        {formError && (
          <div className="auth-v2__form-error" role="alert">
            {formError}
          </div>
        )}

        <div className="auth-v2__actions">
          <PrimaryButton loading={submitting}>Continue to departments</PrimaryButton>
          <p className="auth-v2__switch">
            Already on LeaveFlow? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
