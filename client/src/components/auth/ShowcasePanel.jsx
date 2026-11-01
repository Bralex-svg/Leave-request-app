import { useMemo } from 'react';
import TeamCalendar from './TeamCalendar';
import RequestCard from './RequestCard';

function formatDateLabel(d) {
  const wd = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });
  return `${wd} · ${d.getDate()} ${mon} ${d.getFullYear()}`;
}

export default function ShowcasePanel({ headingPrefix, headingEm, lede }) {
  const dateLabel = useMemo(() => formatDateLabel(new Date()), []);
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <aside className="auth-v2__showcase" aria-hidden="true">
      <div className="auth-v2__glow" />
      <div className="auth-v2__grid" />

      <div className="auth-v2__header">
        <div className="auth-v2__brandmark">
          <div className="auth-v2__logo">
            <div className="auth-v2__logo-ring" />
          </div>
          <span className="auth-v2__brand">LeaveFlow</span>
        </div>
        <span className="auth-v2__date">{dateLabel}</span>
      </div>

      <div className="auth-v2__hero">
        <h1 className="auth-v2__headline" aria-hidden="false">
          {headingPrefix} <em>{headingEm}</em>
        </h1>
        <p className="auth-v2__lede">{lede}</p>
      </div>

      <div className="auth-v2__cardwrap">
        <div className="auth-v2__cardinner">
          <TeamCalendar />
          <RequestCard />
        </div>
      </div>

      <div className="auth-v2__footer">
        <span>© {year} LeaveFlow</span>
        <span>Encrypted · Role-based access</span>
      </div>
    </aside>
  );
}
