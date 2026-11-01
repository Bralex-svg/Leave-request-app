import { useEffect, useState } from 'react';

const STEP_LABELS = ['Submitted', 'Head of Dept.', 'HR confirmed'];
const PILLS = [
  ['Awaiting dept.', '#F3E7C2', '#7A5E12'],
  ['Awaiting dept.', '#F3E7C2', '#7A5E12'],
  ['Awaiting HR', '#F3E7C2', '#7A5E12'],
  ['Approved', '#DCEBE3', '#16463A']
];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function RequestCard() {
  const [stage, setStage] = useState(() => (prefersReducedMotion() ? 3 : 0));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => setStage((s) => (s + 1) % 4), 2200);
    return () => clearInterval(id);
  }, []);

  const steps = STEP_LABELS.map((label, i) => {
    const done = i < stage || stage === 3 || i === 0;
    const active = i === stage && stage < 3;
    return {
      label,
      bar: done ? 'var(--green-700)' : active ? 'var(--gold)' : '#E2DDD0',
      fg: done || active ? '#14201C' : '#A3A096',
      fw: active ? 600 : 500
    };
  });
  const [pillText, pillBg, pillFg] = PILLS[stage];

  return (
    <div className="auth-v2__request">
      <div className="auth-v2__req-head">
        <span className="auth-v2__req-label">Request #LF-2048</span>
        <span className="auth-v2__req-pill" style={{ background: pillBg, color: pillFg }}>
          {pillText}
        </span>
      </div>
      <div className="auth-v2__req-person">
        <div className="auth-v2__req-avatar">AO</div>
        <div className="auth-v2__req-info">
          <span className="auth-v2__req-name">Afia Owusu · Annual leave</span>
          <span className="auth-v2__req-sub">2 – 6 Nov · 5 working days</span>
        </div>
      </div>
      <div className="auth-v2__req-steps">
        {steps.map((s) => (
          <div className="auth-v2__req-step" key={s.label}>
            <span className="auth-v2__req-bar" style={{ background: s.bar }} />
            <span className="auth-v2__req-steplabel" style={{ color: s.fg, fontWeight: s.fw }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
