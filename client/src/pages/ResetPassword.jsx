import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) {
      setError('This reset link is missing its token. Request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don’t match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
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
            Set a new password.
          </div>
          <div className="mt-4 max-w-[400px] text-[15px] leading-[1.6] text-white/70">
            Choose a password you haven't used before.
          </div>
        </div>
        <div className="text-[12.5px] text-white/50">LeaveFlow</div>
      </div>

      <div className="grid place-items-center overflow-y-auto p-6 sm:p-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-2 flex items-center gap-2.5 md:hidden">
            <div className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-gold font-display text-[15px] font-bold text-dark">
              LF
            </div>
            <div className="font-display text-[17px] font-semibold tracking-tight text-dark">LeaveFlow</div>
          </div>

          {done ? (
            <>
              <div className="font-display text-[26px] font-semibold tracking-tight">Password updated</div>
              <div className="mb-[22px] mt-1.5 text-[13.5px] text-muted">You can now sign in with your new password.</div>
              <Link
                to="/login"
                className="block w-full rounded-[10px] bg-primary py-[13px] text-center text-[14.5px] font-bold text-appbg shadow-primary transition-colors hover:bg-primary-hover"
              >
                Sign in
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="font-display text-[26px] font-semibold tracking-tight">Set a new password</div>
              <div className="mb-[22px] mt-1.5 text-[13.5px] text-muted">Choose a new password for your account.</div>

              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="At least 8 characters"
                className="mb-3.5 w-full rounded-[10px] border border-inputborder bg-white px-3.5 py-3 text-[14px]"
              />

              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••"
                className="w-full rounded-[10px] border border-inputborder bg-white px-3.5 py-3 text-[14px]"
              />

              {error && (
                <div className="mt-3 rounded-[9px] bg-danger-tint px-3.5 py-2.5 text-[13px] font-semibold text-danger">
                  {error}
                  {error.includes('expired') || error.includes('invalid') ? (
                    <>
                      {' '}
                      <Link to="/forgot-password" className="underline">
                        Request a new link
                      </Link>
                    </>
                  ) : null}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full rounded-[10px] bg-primary py-[13px] text-[14.5px] font-bold text-appbg shadow-primary transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {submitting ? 'Updating…' : 'Update password'}
              </button>
              <div className="mt-3 text-right text-[12.5px] font-semibold">
                <Link to="/login">Back to sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
