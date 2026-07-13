import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrganisation } from '../../context/OrganisationContext';
import { api } from '../../lib/api';
import { getGreeting, firstName } from '../../lib/greeting';

function deltaColor(card) {
  if (card.label.startsWith('Pending') && card.value !== '0') return '#8A6116';
  if (card.label.startsWith('Staff on leave')) return '#6B7A74';
  return '#1F5C4D';
}

export default function Insights() {
  const { user } = useAuth();
  const { orgName } = useOrganisation();
  const [data, setData] = useState(null);
  const todayLine = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    api.get('/insights').then(setData);
  }, []);

  if (!data) return null;

  return (
    <div>
      <div className="mb-6">
        <div className="font-display text-[26px] font-semibold tracking-tight sm:text-[28px]">
          {getGreeting()}, {firstName(user.name)}
        </div>
        <div className="mt-1 text-[14px] text-muted">
          {todayLine} · {orgName}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {data.statCards.map((s) => (
          <div key={s.label} className="rounded-card border border-border bg-surface p-[18px]">
            <div className="text-[12px] font-bold uppercase tracking-wider text-muted">{s.label}</div>
            <div className="mt-2 font-display text-[32px] font-semibold tracking-tight">{s.value}</div>
            <div className="mt-1 text-[12px] font-semibold" style={{ color: deltaColor(s) }}>
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="mb-[18px] text-[15px] font-bold">Leave days taken per month</div>
          <div className="flex h-[170px] items-end gap-2 overflow-x-auto sm:gap-2.5">
            {data.monthBars.map((m) => (
              <div key={m.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div className="text-[11px] font-bold text-ink-secondary">{m.value}</div>
                <div
                  className="w-full rounded-t-[6px] rounded-b-[3px]"
                  style={{ background: m.current ? '#C9A227' : '#1F5C4D', height: `${m.pct}%` }}
                />
                <div className="text-[11px] font-semibold text-muted">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-border bg-surface p-5">
            <div className="mb-3.5 text-[15px] font-bold">By department</div>
            {data.deptBars.map((d) => (
              <div key={d.name} className="mb-3">
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-muted">{d.value} days</span>
                </div>
                <div className="h-[7px] overflow-hidden rounded-full bg-subtle">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-card border border-[#EAD9A8] bg-[#FFF8E8] p-[18px]">
            <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-[#8A6116]">Coverage alert</div>
            <div className="text-[13px] leading-[1.5] text-[#5C450F]">{data.coverageAlert}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
