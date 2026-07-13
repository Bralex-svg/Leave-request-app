import { useEffect, useState } from 'react';
import { useUI } from '../context/UIContext';
import { api } from '../lib/api';
import { formatDay, formatRange, STATUS_CHIP } from '../lib/format';

function stepStyle(state) {
  if (state === 'done') return { dotBg: '#1F5C4D', dotBorder: '#1F5C4D', mark: '✓', labelColor: '#1C2321', lineBg: '#1F5C4D' };
  if (state === 'declined') return { dotBg: '#B0563F', dotBorder: '#B0563F', mark: '✕', labelColor: '#1C2321', lineBg: '#E7E4DC' };
  if (state === 'current') return { dotBg: '#FFFFFF', dotBorder: '#C9A227', mark: '', labelColor: '#1C2321', lineBg: '#E7E4DC' };
  return { dotBg: '#EFEDE6', dotBorder: '#E7E4DC', mark: '', labelColor: '#A8A69E', lineBg: '#E7E4DC' };
}

function buildSteps(request, approvals) {
  const hod = approvals.find((a) => a.step === 'hod');
  const hr = approvals.find((a) => a.step === 'hr');
  const status = request.status;

  const steps = [
    { label: 'Submitted', sub: `By ${request.staff.name} · ${formatDay(request.submittedAt)}`, state: 'done' }
  ];

  if (status === 'declined') {
    const declinedBy = hod?.approverName || 'Head of Department';
    const note = hod?.note?.trim();
    steps.push({
      label: 'Declined by Head of Department',
      sub: note ? `By ${declinedBy} — “${note}”` : `By ${declinedBy} — no reason given`,
      state: 'declined'
    });
    steps.push({ label: 'HR confirmation', sub: '—', state: 'upcoming' });
    steps.push({ label: 'Staff notified', sub: 'Email sent — request declined', state: 'done' });
  } else {
    steps.push({
      label: 'Head of Department review',
      sub: hod ? `Approved · ${hod.approverName}` : `Awaiting ${request.department?.hodName || 'Head of Department'}`,
      state: hod ? 'done' : 'current'
    });
    steps.push({
      label: 'HR confirmation',
      sub: hr
        ? hr.note
          ? 'Auto-confirmed · HoD-only leave type'
          : `Confirmed · balance updated · ${hr.approverName}`
        : hod
          ? 'Awaiting HR'
          : 'Pending HoD approval',
      state: hr ? 'done' : hod ? 'current' : 'upcoming'
    });
    steps.push({
      label: 'Staff notified',
      sub: status === 'approved' ? 'Email + SMS sent' : '—',
      state: status === 'approved' ? 'done' : 'upcoming'
    });
  }
  return steps;
}

export default function DetailModal() {
  const { detailId, closeDetail } = useUI();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!detailId) {
      setData(null);
      return;
    }
    api.get(`/requests/${detailId}`).then(setData);
  }, [detailId]);

  if (!detailId || !data) return null;
  const { request, approvals } = data;
  const chip = STATUS_CHIP[request.status];
  const steps = buildSteps(request, approvals);

  return (
    <div className="fixed inset-0 z-50 grid animate-fade place-items-center bg-[rgba(18,51,43,0.45)] p-4" onClick={closeDetail}>
      <div
        className="w-full max-w-[480px] animate-fadeUpFast rounded-modal bg-surface p-7 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <div className="font-display text-[21px] font-semibold">{request.leaveType.name} leave</div>
          <span
            className="rounded-full px-3 py-1.5 text-[11.5px] font-bold"
            style={{ background: chip.bg, color: chip.ink }}
          >
            {chip.label}
          </span>
        </div>
        <div className="mb-5 text-[13.5px] text-muted">
          {request.staff.name} · {formatRange(request.startDate, request.endDate)} · {request.days} days
        </div>
        <div className="mb-[22px] rounded-[10px] border border-subtle bg-sidebar px-4 py-3 text-[13.5px] italic text-ink-secondary">
          "{request.reason}"
        </div>

        <div className="mb-3.5 text-[12px] font-bold uppercase tracking-wider text-muted">Approval trail</div>
        <div className="flex flex-col">
          {steps.map((step, i) => {
            const s = stepStyle(step.state);
            const isLast = i === steps.length - 1;
            return (
              <div key={step.label} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <div
                    className="grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold text-sidebar"
                    style={{ background: s.dotBg, borderColor: s.dotBorder }}
                  >
                    {step.state === 'done' || step.state === 'declined' ? s.mark : ''}
                  </div>
                  {!isLast && <div className="w-0.5 flex-1" style={{ minHeight: 22, background: s.lineBg }} />}
                </div>
                <div className="pb-[18px]">
                  <div className="text-[13.5px] font-bold" style={{ color: s.labelColor }}>
                    {step.label}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">{step.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={closeDetail}
          className="mt-2 w-full rounded-[10px] bg-subtle py-3 text-[13.5px] font-bold text-ink"
        >
          Close
        </button>
      </div>
    </div>
  );
}
