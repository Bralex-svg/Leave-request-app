export default function AwayList({ title, away, emptyText }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="mb-3 text-[15px] font-bold">{title}</div>
      {away.length === 0 && <div className="text-[12.5px] text-muted">{emptyText}</div>}
      {away.map((a) => (
        <div key={a.name} className="flex items-center gap-2.5 py-1.5">
          <div className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-full bg-subtle text-[11px] font-bold text-primary">
            {a.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{a.name}</div>
            <div className="truncate text-[11.5px] text-muted">{a.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
