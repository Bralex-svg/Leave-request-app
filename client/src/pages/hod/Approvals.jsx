import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { api } from '../../lib/api';
import { formatRange, daysLabel, formatSubmitted } from '../../lib/format';
import { getGreeting, firstName } from '../../lib/greeting';
import AwayList from '../../components/AwayList';
import DeclineModal from '../../components/DeclineModal';

export default function Approvals() {
  const { user } = useAuth();
  const { showToast, bumpRefresh, refreshKey } = useUI();
  const [requests, setRequests] = useState([]);
  const [away, setAway] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [declining, setDeclining] = useState(null);

  useEffect(() => {
    api.get('/requests?status=pending_hod').then((d) => setRequests(d.requests));
    api.get('/staff/away').then((d) => setAway(d.away));
  }, [refreshKey]);

  async function approve(id) {
    setBusyId(id);
    try {
      const data = await api.post(`/requests/${id}/approve`);
      const verb = data.status === 'approved' ? 'approved' : 'forwarded to HR';
      showToast(`${data.staffFirstName}’s ${data.typeName.toLowerCase()} leave ${verb}`);
      bumpRefresh();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDecline(note) {
    const id = declining.id;
    setBusyId(id);
    try {
      const data = await api.post(`/requests/${id}/decline`, { note });
      showToast(`${data.staffFirstName}’s ${data.typeName.toLowerCase()} leave declined`);
      setDeclining(null);
      bumpRefresh();
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <div className="font-display text-[26px] font-semibold tracking-tight sm:text-[28px]">
          {getGreeting()}, {firstName(user.name)}
        </div>
        <div className="mt-1 text-[14px] text-muted">
          {requests.length} request{requests.length === 1 ? '' : 's'} awaiting your decision
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        {requests.length > 0 ? (
          <div className="flex flex-col gap-3.5">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 sm:flex-row sm:items-start">
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-subtle text-[13px] font-bold text-primary">
                  {r.staff.initials}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="text-[15px] font-bold">{r.staff.name}</div>
                    <div className="text-[12px] text-muted">{r.department?.name}</div>
                    <div
                      className="rounded-full px-2.5 py-1 text-[11.5px] font-bold text-ink"
                      style={{ background: r.leaveType.tint }}
                    >
                      {r.leaveType.emoji} {r.leaveType.name}
                    </div>
                  </div>
                  <div className="mt-2 text-[13.5px] text-ink-secondary">
                    {formatRange(r.startDate, r.endDate)} · <b>{daysLabel(r.days)}</b> · submitted {formatSubmitted(r.submittedAt)}
                  </div>
                  <div className="mt-2 rounded-[9px] border border-subtle bg-sidebar px-3.5 py-2.5 text-[13.5px] italic text-ink-secondary">
                    "{r.reason}"
                  </div>
                  {r.balanceAfterDecision !== null && (
                    <div className="mt-2 text-[12px] text-muted">
                      Balance after approval: <b className="text-ink">{r.balanceAfterDecision} days</b> {r.leaveType.name.toLowerCase()} remaining
                    </div>
                  )}
                </div>
                <div className="flex flex-shrink-0 gap-2 sm:flex-col">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => approve(r.id)}
                    className="flex-1 rounded-[9px] bg-primary px-5 py-2.5 text-[13px] font-bold text-appbg transition-colors hover:bg-primary-hover disabled:opacity-60 sm:flex-none"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => setDeclining(r)}
                    className="flex-1 rounded-[9px] border border-[#E7CFC9] bg-white px-5 py-2 text-[13px] font-bold text-danger transition-colors hover:bg-danger-tint disabled:opacity-60 sm:flex-none"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-inputborder bg-surface p-12 text-center">
            <div className="mb-2.5 text-[34px]">✓</div>
            <div className="text-[16px] font-bold">All caught up</div>
            <div className="mt-1 text-[13.5px] text-muted">No requests waiting for your approval.</div>
          </div>
        )}

        <AwayList
          title={`Currently away · ${user.department?.name || 'Your department'}`}
          away={away}
          emptyText="Nobody in your department is away right now."
        />
      </div>

      {declining && (
        <DeclineModal
          request={declining}
          submitting={busyId === declining.id}
          onCancel={() => setDeclining(null)}
          onConfirm={confirmDecline}
        />
      )}
    </div>
  );
}
