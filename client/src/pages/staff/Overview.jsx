import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { api } from '../../lib/api';
import { formatRange, STATUS_CHIP } from '../../lib/format';
import { getGreeting, firstName as getFirstName } from '../../lib/greeting';
import AwayList from '../../components/AwayList';

export default function StaffOverview() {
  const { user } = useAuth();
  const { openNewRequest, openDetail, refreshKey } = useUI();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [away, setAway] = useState([]);

  useEffect(() => {
    api.get('/requests').then((d) => setRequests(d.requests));
    api.get('/balances').then((d) => setBalances(d.balances));
    api.get('/staff/away').then((d) => setAway(d.away));
  }, [refreshKey]);

  const firstName = getFirstName(user.name);
  const greeting = getGreeting();
  const todayLine = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const recent = requests.slice(0, 3);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const onLeaveNow = requests.find(
    (r) => r.status === 'approved' && new Date(r.startDate) <= today && new Date(r.endDate) >= today
  );
  const upcoming = requests
    .filter((r) => r.status === 'approved' && new Date(r.startDate) > today)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
  const daysUntil = upcoming ? Math.round((new Date(upcoming.startDate) - today) / 86400000) : null;
  const daysUntilReturn = onLeaveNow ? Math.round((new Date(onLeaveNow.endDate) - today) / 86400000) : null;

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="font-display text-[26px] font-semibold tracking-tight sm:text-[28px]">{greeting}, {firstName}</div>
          <div className="mt-1 text-[14px] text-muted">{todayLine}</div>
        </div>
        <button
          onClick={openNewRequest}
          className="w-full rounded-control bg-primary px-[22px] py-3 text-[14px] font-semibold text-appbg shadow-primary transition-colors hover:bg-primary-hover sm:w-auto"
        >
          + New leave request
        </button>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {balances.map((b) => (
          <div key={b.key} className="rounded-card border border-border bg-surface p-[18px]">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[12.5px] font-bold uppercase tracking-wider text-muted">{b.name}</div>
              <div className="h-2 w-2 rounded-full" style={{ background: b.color }} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[30px] font-semibold tracking-tight">{b.remaining}</span>
              <span className="text-[13px] text-muted">of {b.entitlement} days</span>
            </div>
            <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full rounded-full"
                style={{ background: b.color, width: `${Math.round((b.remaining / b.entitlement) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
            <div className="text-[15px] font-bold">Recent requests</div>
            <button onClick={() => navigate('/my-requests')} className="text-[13px] font-semibold text-primary">
              View all →
            </button>
          </div>
          {recent.length === 0 && <div className="px-5 py-8 text-center text-[13.5px] text-muted">No requests yet.</div>}
          {recent.map((r) => {
            const chip = STATUS_CHIP[r.status];
            return (
              <div
                key={r.id}
                onClick={() => openDetail(r.id)}
                className="flex cursor-pointer items-center gap-3.5 border-b border-rowdivider px-5 py-3.5 last:border-0 hover:bg-sidebar"
              >
                <div
                  className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[10px] text-[16px]"
                  style={{ background: r.leaveType.tint }}
                >
                  {r.leaveType.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">
                    {r.leaveType.name} leave · {r.days}d
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted">{formatRange(r.startDate, r.endDate)}</div>
                </div>
                <div
                  className="flex-shrink-0 rounded-full px-2.5 py-1.5 text-[11.5px] font-bold"
                  style={{ background: chip.bg, color: chip.ink }}
                >
                  {chip.label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          {onLeaveNow ? (
            <div className="rounded-card bg-dark p-5 text-appbg">
              <div className="mb-2.5 text-[12px] font-bold uppercase tracking-wider text-gold">You're currently on leave</div>
              <div className="font-display text-[19px] font-semibold leading-tight">
                {onLeaveNow.leaveType.name} leave · {formatRange(onLeaveNow.startDate, onLeaveNow.endDate)}
              </div>
              <div className="mt-1.5 text-[13px] text-white/70">
                Back {daysUntilReturn === 0 ? 'today' : `in ${daysUntilReturn} day${daysUntilReturn === 1 ? '' : 's'}`}
              </div>
            </div>
          ) : (
            <div className="rounded-card bg-dark p-5 text-appbg">
              <div className="mb-2.5 text-[12px] font-bold uppercase tracking-wider text-gold">Upcoming leave</div>
              {upcoming ? (
                <>
                  <div className="font-display text-[19px] font-semibold leading-tight">
                    {upcoming.leaveType.name} leave · {formatRange(upcoming.startDate, upcoming.endDate)}
                  </div>
                  <div className="mt-1.5 text-[13px] text-white/70">
                    Approved · {daysUntil} day{daysUntil === 1 ? '' : 's'} from now
                  </div>
                </>
              ) : (
                <div className="text-[13px] text-white/70">No upcoming approved leave.</div>
              )}
            </div>
          )}
          <AwayList title="Who's away this week" away={away} emptyText="Nobody from your department is away right now." />
        </div>
      </div>
    </div>
  );
}
