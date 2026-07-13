import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { ROLE_HOME, ROLE_OPTIONS } from '../lib/roles';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('LeaveFlow');
  const [role, setRole] = useState('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/organisation/public').then((data) => setOrgName(data.name)).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Enter your staff email and password.');
      return;
    }
    if (!email.includes('@')) {
      setError('That doesn’t look like a valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(email.trim(), password, role);
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setError(err.message);
      if (err.actualRole) setRole(err.actualRole);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 grid grid-cols-1 bg-appbg md:grid-cols-[1fr_1.1fr]">
      <div className="hidden flex-col justify-between bg-dark p-12 text-appbg md:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-gold font-display text-[18px] font-bold text-dark">
            LF
          </div>
          <div className="font-display text-[21px] font-semibold tracking-tight">LeaveFlow</div>
        </div>
        <div>
          <div className="max-w-[420px] font-display text-[38px] font-semibold leading-[1.15] tracking-tight">
            Leave management, without the paperwork.
          </div>
          <div className="mt-4 max-w-[400px] text-[15px] leading-[1.6] text-white/70">
            Request, approve and track staff leave in one place — from submission to final HR confirmation.
          </div>
        </div>
        <div className="text-[12.5px] text-white/50">{orgName}</div>
      </div>

      <div className="grid place-items-center overflow-y-auto p-6 sm:p-10">
        <form onSubmit={handleSubmit} className="w-full max-w-[380px]">
          <div className="mb-2 flex items-center gap-2.5 md:hidden">
            <div className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-gold font-display text-[15px] font-bold text-dark">
              LF
            </div>
            <div className="font-display text-[17px] font-semibold tracking-tight text-dark">LeaveFlow</div>
          </div>
          <div className="font-display text-[26px] font-semibold tracking-tight">Sign in</div>
          <div className="mb-[22px] mt-1.5 text-[13.5px] text-muted">Select your role and sign in with your staff email.</div>

          <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">Sign in as</div>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((opt) => {
              const active = role === opt.key;
              return (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => setRole(opt.key)}
                  className="rounded-[10px] border-[1.5px] p-2.5 text-left transition-colors"
                  style={{ borderColor: active ? '#1F5C4D' : '#E7E4DC', background: active ? '#E2F0E9' : '#FFFFFF' }}
                >
                  <div className="text-[13px] font-bold" style={{ color: active ? '#16453A' : '#1C2321' }}>
                    {opt.label}
                  </div>
                  <div className="mt-px text-[11.5px] text-muted">{opt.sub}</div>
                </button>
              );
            })}
          </div>

          <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Staff email</label>
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@yourorganisation.com"
            className="mb-3.5 w-full rounded-[10px] border border-inputborder bg-white px-3.5 py-3 text-[14px]"
          />

          <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="••••••••"
            className="w-full rounded-[10px] border border-inputborder bg-white px-3.5 py-3 text-[14px]"
          />

          {error && (
            <div className="mt-3 rounded-[9px] bg-danger-tint px-3.5 py-2.5 text-[13px] font-semibold text-danger">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-[10px] bg-primary py-[13px] text-[14.5px] font-bold text-appbg shadow-primary transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="mt-3 text-right">
            <a href="#" className="text-[12.5px] font-semibold">
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
