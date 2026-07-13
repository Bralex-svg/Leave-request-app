import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function Balances() {
  const [staff, setStaff] = useState([]);
  const year = new Date().getFullYear();

  useEffect(() => {
    api.get('/staff/balances').then((d) => setStaff(d.staff));
  }, []);

  return (
    <div>
      <div className="mb-5">
        <div className="font-display text-[26px] font-semibold tracking-tight">Staff balances</div>
        <div className="mt-1 text-[14px] text-muted">Remaining entitlement per staff member, {year} leave year</div>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[1.8fr_1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-subtle bg-sidebar px-5 py-3 text-[11.5px] font-bold uppercase tracking-wider text-muted">
            <div>Staff</div>
            <div>Department</div>
            <div>Annual</div>
            <div>Sick</div>
            <div>Casual</div>
            <div>Study</div>
          </div>
          {staff.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-[1.8fr_1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] items-center gap-3 border-b border-rowdivider px-5 py-3 text-[13.5px] last:border-0 hover:bg-sidebar"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-full bg-subtle text-[11px] font-bold text-primary">
                  {s.initials}
                </div>
                <div className="font-semibold">{s.name}</div>
              </div>
              <div className="text-[12.5px] text-muted">{s.department}</div>
              <div>{s.annual}</div>
              <div>{s.sick}</div>
              <div>{s.casual}</div>
              <div>{s.study}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
