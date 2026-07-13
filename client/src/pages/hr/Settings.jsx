import { useEffect, useRef, useState } from 'react';
import { useOrganisation } from '../../context/OrganisationContext';
import { api } from '../../lib/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Settings() {
  const { orgName, leaveYearStartMonth, setOrgLocal } = useOrganisation();
  const [types, setTypes] = useState([]);
  const [nameDraft, setNameDraft] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get('/leave-types?active=false').then((d) => setTypes(d.leaveTypes));
  }, []);

  useEffect(() => {
    setNameDraft(orgName);
  }, [orgName]);

  function handleNameChange(value) {
    setNameDraft(value);
    setOrgLocal((o) => (o ? { ...o, name: value } : o));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.patch('/organisation', { name: value });
    }, 400);
  }

  async function handleYearStartChange(value) {
    setOrgLocal((o) => (o ? { ...o, leaveYearStartMonth: value } : o));
    await api.patch('/organisation', { leaveYearStartMonth: value });
  }

  async function toggleType(t) {
    setTypes((prev) => prev.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x)));
    await api.patch(`/leave-types/${t.id}`, { active: !t.active });
  }

  return (
    <div>
      <div className="mb-5">
        <div className="font-display text-[26px] font-semibold tracking-tight">Settings & branding</div>
        <div className="mt-1 text-[14px] text-muted">
          LeaveFlow adapts to any organisation — policies, identity and workflow are fully configurable
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="border-b border-subtle px-5 py-4 text-[15px] font-bold">Leave policy</div>
          <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-3 bg-sidebar px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-muted">
            <div>Leave type</div>
            <div>Entitlement</div>
            <div>Approval</div>
            <div>Active</div>
          </div>
          {types.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] items-center gap-3 border-b border-rowdivider px-5 py-3 text-[13.5px] last:border-0"
            >
              <div className="font-semibold">
                {t.emoji} {t.name}
              </div>
              <div>{t.entitlementDays ? `${t.entitlementDays} days / yr` : 'Case by case'}</div>
              <div className="text-[12.5px] text-muted">{t.approvalChain === 'hod_only' ? 'HoD only' : 'HoD → HR'}</div>
              <div>
                <button
                  onClick={() => toggleType(t)}
                  className="relative h-[22px] w-[38px] rounded-full transition-colors"
                  style={{ background: t.active ? '#1F5C4D' : '#D8D5CB' }}
                >
                  <span
                    className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all"
                    style={{ left: t.active ? '19px' : '3px' }}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-border bg-surface p-5">
            <div className="mb-1 text-[15px] font-bold">Organisation identity</div>
            <div className="mb-3.5 text-[12.5px] text-muted">White-label the platform for your institution.</div>
            <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">Organisation name</div>
            <input
              value={nameDraft}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
            />
            <div className="mb-1.5 mt-3.5 text-[12px] font-bold uppercase tracking-wider text-muted">Leave year start</div>
            <select
              value={leaveYearStartMonth || 'January'}
              onChange={(e) => handleYearStartChange(e.target.value)}
              className="w-full rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
            >
              {MONTHS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
