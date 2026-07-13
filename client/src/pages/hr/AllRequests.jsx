import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { api } from '../../lib/api';
import { formatRange, STATUS_CHIP } from '../../lib/format';
import { getGreeting, firstName } from '../../lib/greeting';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'declined', label: 'Declined' }
];

export default function AllRequests() {
  const { user } = useAuth();
  const { openDetail, showToast, bumpRefresh, refreshKey } = useUI();
  const [filter, setFilter] = useState('all');
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api.get(`/requests?status=${filter}`).then((d) => setRequests(d.requests));
  }, [filter, refreshKey]);

  async function finalise(id) {
    setBusyId(id);
    try {
      const data = await api.post(`/requests/${id}/finalise`);
      showToast(`${data.staffFirstName}’s ${data.typeName.toLowerCase()} leave approved — balance updated`);
      bumpRefresh();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const isDeptLog = user.role === 'hod';
  const isHome = user.role === 'hr';

  return (
    <div>
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="font-display text-[26px] font-semibold tracking-tight sm:text-[28px]">
            {isHome ? `${getGreeting()}, ${firstName(user.name)}` : isDeptLog ? 'Department log' : 'All requests'}
          </div>
          <div className="mt-1 text-[14px] text-muted">
            {isDeptLog ? `${user.department?.name || 'Your department'} leave activity` : 'Institution-wide leave activity'}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
                style={{
                  border: `1px solid ${active ? '#12332B' : '#D8D5CB'}`,
                  background: active ? '#12332B' : '#FFFFFF',
                  color: active ? '#F4F3EF' : '#4A554F'
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[1.5fr_1.1fr_1.1fr_1.5fr_0.5fr_1.1fr_0.9fr] gap-3 border-b border-subtle bg-sidebar px-5 py-3 text-[11.5px] font-bold uppercase tracking-wider text-muted">
            <div>Staff</div>
            <div>Department</div>
            <div>Type</div>
            <div>Dates</div>
            <div>Days</div>
            <div>Status</div>
            <div></div>
          </div>
          {requests.length === 0 && <div className="px-5 py-10 text-center text-[13.5px] text-muted">No requests found.</div>}
          {requests.map((r) => {
            const chip = STATUS_CHIP[r.status];
            const canFinalise = user.role === 'hr' && r.status === 'pending_hr';
            return (
              <div
                key={r.id}
                className="grid grid-cols-[1.5fr_1.1fr_1.1fr_1.5fr_0.5fr_1.1fr_0.9fr] items-center gap-3 border-b border-rowdivider px-5 py-3 text-[13.5px] last:border-0 hover:bg-sidebar"
              >
                <div className="cursor-pointer font-semibold" onClick={() => openDetail(r.id)}>
                  {r.staff.name}
                </div>
                <div className="text-[12.5px] text-muted">{r.department?.name}</div>
                <div>
                  {r.leaveType.emoji} {r.leaveType.name}
                </div>
                <div className="text-[12.5px] text-ink-secondary">{formatRange(r.startDate, r.endDate)}</div>
                <div>{r.days}</div>
                <div>
                  <span className="rounded-full px-2.5 py-1.5 text-[11.5px] font-bold" style={{ background: chip.bg, color: chip.ink }}>
                    {chip.label}
                  </span>
                </div>
                <div className="flex justify-end">
                  {canFinalise && (
                    <button
                      disabled={busyId === r.id}
                      onClick={() => finalise(r.id)}
                      className="rounded-[7px] bg-primary px-3 py-1.5 text-[11.5px] font-bold text-appbg disabled:opacity-60"
                    >
                      Finalise
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
