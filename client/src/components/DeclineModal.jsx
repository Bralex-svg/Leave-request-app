import { useState } from 'react';

export default function DeclineModal({ request, onCancel, onConfirm, submitting }) {
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 grid animate-fade place-items-center bg-[rgba(18,51,43,0.45)] p-4" onClick={onCancel}>
      <div
        className="w-full max-w-[440px] animate-fadeUpFast rounded-modal bg-surface p-7 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1.5 font-display text-[21px] font-semibold">Decline request</div>
        <div className="mb-5 text-[13.5px] text-muted">
          {request.staff.name} · {request.leaveType.emoji} {request.leaveType.name} leave
        </div>

        <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">Reason (optional)</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Let the staff member know why — this is optional, but helps them understand the decision."
          className="min-h-[90px] w-full resize-y rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
          autoFocus
        />

        <div className="mt-5 flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="rounded-[10px] border border-inputborder bg-white px-[18px] py-2.5 text-[13.5px] font-semibold text-ink-secondary"
          >
            Cancel
          </button>
          <button
            disabled={submitting}
            onClick={() => onConfirm(note.trim())}
            className="rounded-[10px] bg-danger px-[22px] py-2.5 text-[13.5px] font-bold text-white transition-colors disabled:opacity-60"
          >
            {submitting ? 'Declining…' : 'Confirm decline'}
          </button>
        </div>
      </div>
    </div>
  );
}
