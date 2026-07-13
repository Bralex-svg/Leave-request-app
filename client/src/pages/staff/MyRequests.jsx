import { useEffect, useState } from 'react';
import { useUI } from '../../context/UIContext';
import { api } from '../../lib/api';
import { formatRange, formatSubmitted, STATUS_CHIP } from '../../lib/format';

export default function MyRequests() {
  const { openNewRequest, openDetail, refreshKey } = useUI();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    api.get('/requests').then((d) => setRequests(d.requests));
  }, [refreshKey]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="font-display text-[26px] font-semibold tracking-tight">My requests</div>
        <button
          onClick={openNewRequest}
          className="rounded-control bg-primary px-5 py-2.5 text-[14px] font-semibold text-appbg transition-colors hover:bg-primary-hover"
        >
          + New request
        </button>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[1.3fr_1.6fr_0.6fr_1fr_1fr] gap-3 border-b border-subtle bg-sidebar px-5 py-3 text-[11.5px] font-bold uppercase tracking-wider text-muted">
            <div>Type</div>
            <div>Dates</div>
            <div>Days</div>
            <div>Submitted</div>
            <div>Status</div>
          </div>
          {requests.length === 0 && <div className="px-5 py-10 text-center text-[13.5px] text-muted">No requests yet.</div>}
          {requests.map((r) => {
            const chip = STATUS_CHIP[r.status];
            return (
              <div
                key={r.id}
                onClick={() => openDetail(r.id)}
                className="grid cursor-pointer grid-cols-[1.3fr_1.6fr_0.6fr_1fr_1fr] items-center gap-3 border-b border-rowdivider px-5 py-3.5 text-[13.5px] last:border-0 hover:bg-sidebar"
              >
                <div className="font-semibold">
                  {r.leaveType.emoji} {r.leaveType.name}
                </div>
                <div className="text-ink-secondary">{formatRange(r.startDate, r.endDate)}</div>
                <div>{r.days}</div>
                <div className="text-muted">{formatSubmitted(r.submittedAt)}</div>
                <div>
                  <span className="rounded-full px-2.5 py-1.5 text-[11.5px] font-bold" style={{ background: chip.bg, color: chip.ink }}>
                    {chip.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
