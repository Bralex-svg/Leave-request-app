import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const GENERIC_MESSAGE = "If an account exists for that email, we've sent a reset link.";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
    } catch {
      // Still show the generic confirmation — the endpoint itself never leaks whether
      // the email matched an account, so a network-level failure shouldn't either.
    } finally {
      setSubmitting(false);
      setSent(true);
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
            Forgot your password?
          </div>
          <div className="mt-4 max-w-[400px] text-[15px] leading-[1.6] text-white/70">
            Enter your email and we'll send you a link to reset it.
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

          {sent ? (
            <>
              <div className="font-display text-[26px] font-semibold tracking-tight">Check your email</div>
              <div className="mb-[22px] mt-1.5 text-[13.5px] text-muted">{GENERIC_MESSAGE}</div>
              <Link
                to="/login"
                className="block w-full rounded-[10px] bg-primary py-[13px] text-center text-[14.5px] font-bold text-appbg shadow-primary transition-colors hover:bg-primary-hover"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="font-display text-[26px] font-semibold tracking-tight">Reset your password</div>
              <div className="mb-[22px] mt-1.5 text-[13.5px] text-muted">We'll email you a link to set a new one.</div>

              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Email</label>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@yourorganisation.com"
                className="mb-3.5 w-full rounded-[10px] border border-inputborder bg-white px-3.5 py-3 text-[14px]"
              />

              {error && (
                <div className="mt-3 rounded-[9px] bg-danger-tint px-3.5 py-2.5 text-[13px] font-semibold text-danger">{error}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full rounded-[10px] bg-primary py-[13px] text-[14.5px] font-bold text-appbg shadow-primary transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
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
