import { useEffect, useState } from 'react';
import { useUI } from '../context/UIContext';
import { api } from '../lib/api';

const EMPTY_FORM = { typeId: null, typeKey: 'annual', start: '', end: '', reason: '' };

export default function NewRequestModal() {
  const { newRequestOpen, closeNewRequest, showToast, bumpRefresh } = useUI();
  const [types, setTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!newRequestOpen) return;
    setForm(EMPTY_FORM);
    setError(null);
    Promise.all([api.get('/leave-types'), api.get('/balances')]).then(([t, b]) => {
      setTypes(t.leaveTypes);
      setBalances(b.balances);
      if (t.leaveTypes.length) setForm((f) => ({ ...f, typeId: t.leaveTypes[0].id, typeKey: t.leaveTypes[0].key }));
    });
  }, [newRequestOpen]);

  if (!newRequestOpen) return null;

  const selectedType = types.find((t) => t.id === form.typeId);
  const selectedBalance = balances.find((b) => b.key === form.typeKey);

  let days = 0;
  if (form.start && form.end) {
    const diff = (new Date(form.end) - new Date(form.start)) / 86400000 + 1;
    if (diff > 0) days = Math.round(diff);
  }

  const summary =
    days > 0 && selectedType
      ? `${days} day${days === 1 ? '' : 's'} · ${selectedType.name}${selectedBalance ? ` (${selectedBalance.remaining} remaining)` : ''}`
      : 'Select your dates';

  async function handleSubmit() {
    if (!form.start || !form.end) return setError('Please choose both a first and last day.');
    if (days <= 0) return setError('Last day must be on or after the first day.');
    if (!form.reason.trim()) return setError('Please add a brief reason.');

    setSubmitting(true);
    setError(null);
    try {
      await api.post('/requests', { leaveTypeId: form.typeId, startDate: form.start, endDate: form.end, reason: form.reason });
      closeNewRequest();
      bumpRefresh();
      showToast('Request submitted — sent to your Head of Department');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid animate-fade place-items-center bg-[rgba(18,51,43,0.45)] p-4" onClick={closeNewRequest}>
      <div
        className="w-full max-w-[520px] animate-fadeUpFast rounded-modal bg-surface p-7 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="font-display text-[21px] font-semibold">New leave request</div>
          <button
            onClick={closeNewRequest}
            className="grid h-[30px] w-[30px] place-items-center rounded-full bg-subtle text-[14px] text-ink-secondary"
          >
            ✕
          </button>
        </div>

        <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">Leave type</div>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {types.map((t) => {
            const active = form.typeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, typeId: t.id, typeKey: t.key }))}
                className="rounded-[10px] border-[1.5px] px-1 py-2.5 text-center"
                style={{ borderColor: active ? '#1F5C4D' : '#E7E4DC', background: active ? '#E2F0E9' : '#FFFFFF' }}
              >
                <div className="text-[17px]">{t.emoji}</div>
                <div className="mt-0.5 text-[11px] font-bold" style={{ color: active ? '#16453A' : '#4A554F' }}>
                  {t.name}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">First day</div>
            <input
              type="date"
              value={form.start}
              onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
              className="w-full rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
            />
          </div>
          <div>
            <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">Last day</div>
            <input
              type="date"
              value={form.end}
              onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
              className="w-full rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
            />
          </div>
        </div>

        <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">Reason</div>
        <textarea
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          placeholder="Brief reason for your request…"
          className="min-h-[74px] w-full resize-y rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
        />

        {error && <div className="mt-3 rounded-[9px] bg-danger-tint px-3.5 py-2.5 text-[13px] font-semibold text-danger">{error}</div>}

        <div className="mt-5 flex items-center justify-between">
          <div className="text-[13px] text-ink-secondary">{summary}</div>
          <div className="flex gap-2.5">
            <button
              onClick={closeNewRequest}
              className="rounded-[10px] border border-inputborder bg-white px-[18px] py-2.5 text-[13.5px] font-semibold text-ink-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-[10px] bg-primary px-[22px] py-2.5 text-[13.5px] font-bold text-appbg transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
