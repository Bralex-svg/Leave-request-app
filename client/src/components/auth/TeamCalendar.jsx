import { useMemo } from 'react';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Sample leave spans (day-of-month) — defaults only, real data can be passed via `people`.
const DEFAULT_PEOPLE = [
  { name: 'A. Owusu', type: 'Annual', color: '#D9BC67', from: 12, to: 16 },
  { name: 'K. Mensah', type: 'Study', color: '#7FC0A2', from: 19, to: 21 },
  { name: 'J. Boateng', type: 'Parental', color: '#D48C6E', from: 26, to: 31 }
];

export default function TeamCalendar({ people = DEFAULT_PEOPLE, subLabel = 'Nursing · Ward B' }) {
  const { monthName, year, cells } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const todayNum = now.getDate();
    const firstDow = new Date(y, m, 1).getDay(); // 0 = Sunday
    const offset = (firstDow + 6) % 7; // Monday-first offset
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

    const cellsArr = [];
    for (let i = 0; i < totalCells; i++) {
      const n = i - offset + 1;
      if (n < 1 || n > daysInMonth) {
        cellsArr.push(null);
        continue;
      }
      const wd = i % 7;
      const weekend = wd >= 5;
      const person = people.find((p) => n >= p.from && n <= p.to && !weekend);
      cellsArr.push({
        n,
        isToday: n === todayNum,
        weekend,
        bg: person ? 'rgba(237,240,234,0.07)' : 'rgba(237,240,234,0.025)',
        bar: person ? person.color : 'transparent'
      });
    }

    return { monthName: now.toLocaleDateString('en-GB', { month: 'long' }), year: y, cells: cellsArr };
  }, [people]);

  return (
    <div className="auth-v2__calendar">
      <div className="auth-v2__cal-head">
        <span className="auth-v2__cal-title">
          {monthName} <span>{year}</span>
        </span>
        <span className="auth-v2__cal-sub">{subLabel}</span>
      </div>

      <div className="auth-v2__cal-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w} className="auth-v2__cal-wd">
            {w}
          </span>
        ))}
      </div>

      <div className="auth-v2__cal-grid">
        {cells.map((d, i) => (
          <div
            key={i}
            className="auth-v2__cal-cell"
            style={{
              background: d ? d.bg : 'transparent',
              boxShadow: d?.isToday ? '0 0 0 1.5px var(--gold) inset' : 'none'
            }}
          >
            {d && (
              <>
                <span
                  className="auth-v2__cal-num"
                  style={{ color: d.isToday ? 'var(--gold)' : d.weekend ? '#55695F' : '#B7C5BE' }}
                >
                  {String(d.n).padStart(2, '0')}
                </span>
                <span className="auth-v2__cal-bar" style={{ background: d.bar }} />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="auth-v2__cal-key">
        {people.map((p) => (
          <span className="auth-v2__cal-key-item" key={p.name}>
            <span className="auth-v2__cal-swatch" style={{ background: p.color }} />
            {p.name} <span className="auth-v2__cal-key-type">{p.type}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
