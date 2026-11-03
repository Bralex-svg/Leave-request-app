import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { parseStaffCsv, downloadStaffCsvTemplate } from '../../lib/csv';
import { ROLE_HOME } from '../../lib/roles';

const STEPS = ['Leave policy', 'Departments', 'Staff', 'Done'];
const EMPTY_MANUAL_FORM = { name: '', email: '', role: 'staff', title: '', departmentId: '' };

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [leaveTypes, setLeaveTypes] = useState([]);
  const entitlementDebounceRef = useRef({});

  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [deptError, setDeptError] = useState(null);
  const [addingDept, setAddingDept] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [renameError, setRenameError] = useState(null);
  const [renaming, setRenaming] = useState(false);

  const [staffTab, setStaffTab] = useState('manual');
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM);
  const [showBalances, setShowBalances] = useState(false);
  const [balanceOverrides, setBalanceOverrides] = useState({});
  const [manualError, setManualError] = useState(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const [csvRows, setCsvRows] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvError, setCsvError] = useState(null);
  const [importing, setImporting] = useState(false);

  const [sessionStaff, setSessionStaff] = useState([]);
  const [hodAssigning, setHodAssigning] = useState({});

  useEffect(() => {
    api.get('/leave-types?active=false').then((d) => setLeaveTypes(d.leaveTypes));
    api.get('/departments').then((d) => setDepartments(d.departments));
  }, []);

  function toggleType(t) {
    setLeaveTypes((prev) => prev.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x)));
    api.patch(`/leave-types/${t.id}`, { active: !t.active });
  }

  function handleEntitlementChange(t, rawValue) {
    const entitlementDays = rawValue === '' ? null : Math.max(0, parseInt(rawValue, 10) || 0);
    setLeaveTypes((prev) => prev.map((x) => (x.id === t.id ? { ...x, entitlementDays } : x)));
    clearTimeout(entitlementDebounceRef.current[t.id]);
    entitlementDebounceRef.current[t.id] = setTimeout(() => {
      api.patch(`/leave-types/${t.id}`, { entitlementDays });
    }, 500);
  }

  async function addDepartment(e) {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setAddingDept(true);
    setDeptError(null);
    try {
      const { department } = await api.post('/departments', { name: newDeptName.trim() });
      setDepartments((prev) => [...prev, department].sort((a, b) => a.name.localeCompare(b.name)));
      setNewDeptName('');
    } catch (err) {
      setDeptError(err.message);
    } finally {
      setAddingDept(false);
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    if (!manualForm.name.trim() || !manualForm.email.trim()) {
      setManualError('Enter a name and email.');
      return;
    }
    setManualSubmitting(true);
    setManualError(null);
    try {
      const overrides = Object.entries(balanceOverrides)
        .filter(([, v]) => v !== '' && v != null)
        .map(([leaveTypeKey, entitlement]) => ({ leaveTypeKey, entitlement: parseInt(entitlement, 10) }));
      const { user: created, tempPassword } = await api.post('/staff', {
        name: manualForm.name.trim(),
        email: manualForm.email.trim(),
        role: manualForm.role,
        title: manualForm.title.trim(),
        departmentId: manualForm.departmentId || null,
        balanceOverrides: overrides.length ? overrides : undefined
      });
      setSessionStaff((prev) => [...prev, { id: created.id, name: created.name, email: created.email, role: created.role, tempPassword }]);
      setManualForm({ ...EMPTY_MANUAL_FORM, departmentId: manualForm.departmentId, role: manualForm.role });
      setShowBalances(false);
      setBalanceOverrides({});
    } catch (err) {
      setManualError(err.message);
    } finally {
      setManualSubmitting(false);
    }
  }

  async function handleCsvFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvError(null);
    const { rows, parseErrors } = await parseStaffCsv(file);
    if (parseErrors.length) {
      setCsvError(parseErrors.join(' '));
    }
    setCsvRows(rows.map((r) => ({ ...r, _error: null })));
  }

  async function handleCsvImport() {
    if (!csvRows.length) return;
    setImporting(true);
    setCsvError(null);
    try {
      const { created, errors } = await api.post('/staff/bulk', {
        rows: csvRows.map(({ name, email, role, title, department }) => ({ name, email, role, title, department }))
      });
      if (created.length) {
        setSessionStaff((prev) => [
          ...prev,
          ...created.map((c) => ({ id: c.id, name: c.name, email: c.email, role: c.role, tempPassword: c.tempPassword }))
        ]);
      }
      const errorByRow = {};
      for (const e of errors) errorByRow[e.row] = e.message;
      setCsvRows((prev) =>
        prev.map((r, i) => ({ ...r, _error: errorByRow[i + 1] || null })).filter((r) => r._error)
      );
    } catch (err) {
      setCsvError(err.message);
    } finally {
      setImporting(false);
    }
  }

  function startEditDept(d) {
    setEditingDeptId(d.id);
    setEditDeptName(d.name);
    setRenameError(null);
  }

  function cancelEditDept() {
    setEditingDeptId(null);
    setEditDeptName('');
    setRenameError(null);
  }

  async function saveEditDept(deptId) {
    if (!editDeptName.trim()) {
      setRenameError('Department name cannot be empty.');
      return;
    }
    setRenaming(true);
    setRenameError(null);
    try {
      const { department } = await api.patch(`/departments/${deptId}`, { name: editDeptName.trim() });
      setDepartments((prev) => prev.map((d) => (d.id === deptId ? department : d)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingDeptId(null);
      setEditDeptName('');
    } catch (err) {
      setRenameError(err.message);
    } finally {
      setRenaming(false);
    }
  }

  async function assignHod(deptId, hodUserId) {
    setHodAssigning((prev) => ({ ...prev, [deptId]: true }));
    try {
      const { department } = await api.patch(`/departments/${deptId}`, { hodUserId: hodUserId || null });
      setDepartments((prev) => prev.map((d) => (d.id === deptId ? department : d)));
    } finally {
      setHodAssigning((prev) => ({ ...prev, [deptId]: false }));
    }
  }

  const hodCandidates = sessionStaff.filter((s) => s.role === 'hod');
  const departmentsNeedingHod = departments.filter((d) => !d.hodUserId && hodCandidates.length > 0);

  return (
    <div className="min-h-screen bg-appbg">
      <header className="flex h-[60px] items-center gap-3 bg-dark px-4 sm:px-6">
        <div className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-gold font-display text-[15px] font-bold text-dark">
          LF
        </div>
        <div className="font-display text-[17px] font-semibold tracking-tight text-appbg">LeaveFlow</div>
        <div className="flex-1" />
        <button
          onClick={() => navigate(ROLE_HOME.hr)}
          className="text-[12.5px] font-semibold text-white/70 hover:text-white"
        >
          ← Back to dashboard
        </button>
        <div className="mx-3 h-4 w-px bg-white/20" />
        <div className="text-[12.5px] text-white/60">Signed in as {user.name}</div>
      </header>

      <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-8">
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className="flex items-center gap-2"
                title={`Go to ${label}`}
              >
                <div
                  className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold"
                  style={{
                    background: i <= step ? '#1F5C4D' : '#E7E4DC',
                    color: i <= step ? '#F4F3EF' : '#6B7A74'
                  }}
                >
                  {i + 1}
                </div>
                <div className="text-[12.5px] font-semibold" style={{ color: i <= step ? '#1C2321' : '#A8A69E' }}>
                  {label}
                </div>
              </button>
              {i < STEPS.length - 1 && <div className="h-px flex-1" style={{ background: i < step ? '#1F5C4D' : '#E7E4DC' }} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="rounded-card border border-border bg-surface">
            <div className="border-b border-subtle px-5 py-4">
              <div className="text-[15px] font-bold">Review your leave policy</div>
              <div className="mt-0.5 text-[12.5px] text-muted">
                We've pre-filled the common leave types — adjust entitlements or switch any off. You can change these any time in Settings.
              </div>
            </div>
            <div className="grid grid-cols-[1.5fr_1fr_0.8fr] gap-3 bg-sidebar px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-muted">
              <div>Leave type</div>
              <div>Entitlement</div>
              <div>Active</div>
            </div>
            {leaveTypes.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[1.5fr_1fr_0.8fr] items-center gap-3 border-b border-rowdivider px-5 py-3 text-[13.5px] last:border-0"
              >
                <div className="font-semibold">
                  {t.emoji} {t.name}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={t.entitlementDays ?? ''}
                    onChange={(e) => handleEntitlementChange(t, e.target.value)}
                    placeholder="Case by case"
                    className="w-[64px] rounded-[7px] border border-inputborder bg-sidebar px-2 py-1 text-[13px]"
                  />
                  {t.entitlementDays !== null && <span className="text-[12px] text-muted">days/yr</span>}
                </div>
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
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="rounded-card border border-border bg-surface p-5">
            <div className="text-[15px] font-bold">Add your departments</div>
            <div className="mt-0.5 text-[12.5px] text-muted">Staff and heads of department are assigned to these next.</div>

            <form onSubmit={addDepartment} className="mt-4 flex gap-2">
              <input
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Nursing"
                className="flex-1 rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
              />
              <button
                type="submit"
                disabled={addingDept}
                className="rounded-[10px] bg-primary px-[18px] py-2.5 text-[13.5px] font-bold text-appbg transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                Add
              </button>
            </form>
            {deptError && <div className="mt-2 text-[12.5px] font-semibold text-danger">{deptError}</div>}

            <div className="mt-4 flex flex-col gap-1.5">
              {departments.map((d) =>
                editingDeptId === d.id ? (
                  <div key={d.id} className="rounded-[9px] border border-primary bg-sidebar px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editDeptName}
                        onChange={(e) => setEditDeptName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditDept(d.id);
                          if (e.key === 'Escape') cancelEditDept();
                        }}
                        className="flex-1 rounded-[7px] border border-inputborder bg-white px-2.5 py-1.5 text-[13.5px]"
                      />
                      <button
                        onClick={() => saveEditDept(d.id)}
                        disabled={renaming}
                        className="rounded-[7px] bg-primary px-3 py-1.5 text-[12.5px] font-bold text-appbg disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditDept}
                        className="rounded-[7px] border border-inputborder bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                    {renameError && <div className="mt-1.5 text-[12px] font-semibold text-danger">{renameError}</div>}
                  </div>
                ) : (
                  <div key={d.id} className="flex items-center justify-between rounded-[9px] border border-border bg-sidebar px-3.5 py-2.5 text-[13.5px]">
                    <span className="font-semibold">{d.name}</span>
                    <div className="flex items-center gap-3">
                      {d.hodName && <span className="text-[12px] text-muted">HoD: {d.hodName}</span>}
                      <button onClick={() => startEditDept(d)} className="text-[12px] font-semibold text-primary">
                        Rename
                      </button>
                    </div>
                  </div>
                )
              )}
              {!departments.length && <div className="text-[13px] text-muted">No departments yet — add your first one above.</div>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setStaffTab('manual')}
                className="rounded-[9px] px-3.5 py-2 text-[13px] font-bold"
                style={{ background: staffTab === 'manual' ? '#E2F0E9' : '#EFEDE6', color: staffTab === 'manual' ? '#16453A' : '#4A554F' }}
              >
                Add manually
              </button>
              <button
                onClick={() => setStaffTab('csv')}
                className="rounded-[9px] px-3.5 py-2 text-[13px] font-bold"
                style={{ background: staffTab === 'csv' ? '#E2F0E9' : '#EFEDE6', color: staffTab === 'csv' ? '#16453A' : '#4A554F' }}
              >
                Bulk import (CSV)
              </button>
            </div>

            {staffTab === 'manual' && (
              <form onSubmit={handleManualSubmit} className="rounded-card border border-border bg-surface p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Name</label>
                    <input
                      value={manualForm.name}
                      onChange={(e) => setManualForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Doe"
                      className="w-full rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Email</label>
                    <input
                      value={manualForm.email}
                      onChange={(e) => setManualForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="jane.doe@example.com"
                      className="w-full rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
                    />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Role</label>
                    <select
                      value={manualForm.role}
                      onChange={(e) => setManualForm((f) => ({ ...f, role: e.target.value }))}
                      className="w-full rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
                    >
                      <option value="staff">Staff</option>
                      <option value="hod">Head of Department</option>
                      <option value="hr">HR</option>
                      <option value="principal">Executive</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Title</label>
                    <input
                      value={manualForm.title}
                      onChange={(e) => setManualForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Staff Nurse"
                      className="w-full rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">Department</label>
                    <select
                      value={manualForm.departmentId}
                      onChange={(e) => setManualForm((f) => ({ ...f, departmentId: e.target.value }))}
                      className="w-full rounded-[9px] border border-inputborder bg-sidebar px-3 py-2.5 text-[13.5px]"
                    >
                      <option value="">Unassigned</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBalances((v) => !v)}
                  className="mt-3 text-[12.5px] font-semibold text-primary"
                >
                  {showBalances ? 'Hide' : 'Set'} starting balances (optional)
                </button>
                {showBalances && (
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-[9px] border border-border bg-sidebar p-3 sm:grid-cols-4">
                    {leaveTypes.filter((t) => t.active).map((t) => (
                      <div key={t.key}>
                        <label className="mb-1 block text-[11px] font-bold text-muted">{t.name}</label>
                        <input
                          type="number"
                          min="0"
                          value={balanceOverrides[t.key] ?? ''}
                          onChange={(e) => setBalanceOverrides((o) => ({ ...o, [t.key]: e.target.value }))}
                          placeholder={t.entitlementDays ?? '—'}
                          className="w-full rounded-[7px] border border-inputborder bg-white px-2 py-1.5 text-[13px]"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {manualError && <div className="mt-3 rounded-[9px] bg-danger-tint px-3.5 py-2.5 text-[13px] font-semibold text-danger">{manualError}</div>}

                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="mt-4 rounded-[10px] bg-primary px-[18px] py-2.5 text-[13.5px] font-bold text-appbg transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {manualSubmitting ? 'Adding…' : 'Add staff member'}
                </button>
              </form>
            )}

            {staffTab === 'csv' && (
              <div className="rounded-card border border-border bg-surface p-5">
                <div className="text-[13.5px] text-muted">
                  Columns: <code>name, email, role, title, department</code>. Role/title/department are optional; department must already exist above.
                </div>
                <button onClick={downloadStaffCsvTemplate} className="mt-2 text-[12.5px] font-semibold text-primary">
                  Download CSV template
                </button>

                <input type="file" accept=".csv" onChange={handleCsvFile} className="mt-3 block text-[13px]" />
                {csvFileName && <div className="mt-1 text-[12px] text-muted">{csvFileName} — {csvRows.length} row(s) parsed</div>}
                {csvError && <div className="mt-2 text-[12.5px] font-semibold text-danger">{csvError}</div>}

                {csvRows.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-[9px] border border-border">
                    <div className="grid grid-cols-[1.2fr_1.5fr_0.8fr_1fr_2fr] gap-2 bg-sidebar px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                      <div>Name</div>
                      <div>Email</div>
                      <div>Role</div>
                      <div>Department</div>
                      <div>Status</div>
                    </div>
                    {csvRows.map((r, i) => (
                      <div key={i} className="grid grid-cols-[1.2fr_1.5fr_0.8fr_1fr_2fr] gap-2 border-t border-rowdivider px-3 py-2 text-[12.5px]">
                        <div>{r.name}</div>
                        <div className="truncate">{r.email}</div>
                        <div>{r.role || 'staff'}</div>
                        <div>{r.department || '—'}</div>
                        <div className={r._error ? 'font-semibold text-danger' : 'text-muted'}>{r._error || 'Ready'}</div>
                      </div>
                    ))}
                  </div>
                )}

                {csvRows.length > 0 && (
                  <button
                    onClick={handleCsvImport}
                    disabled={importing}
                    className="mt-4 rounded-[10px] bg-primary px-[18px] py-2.5 text-[13.5px] font-bold text-appbg transition-colors hover:bg-primary-hover disabled:opacity-60"
                  >
                    {importing ? 'Importing…' : csvRows.some((r) => r._error) ? 'Retry failed rows' : `Import ${csvRows.length} staff`}
                  </button>
                )}
              </div>
            )}

            {sessionStaff.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-[13px] font-bold">Added this session ({sessionStaff.length})</div>
                <div className="overflow-hidden rounded-[9px] border border-border">
                  <div className="grid grid-cols-[1.3fr_1.5fr_0.8fr_1fr] gap-2 bg-sidebar px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <div>Name</div>
                    <div>Email</div>
                    <div>Role</div>
                    <div>Temp password</div>
                  </div>
                  {sessionStaff.map((s) => (
                    <div key={s.id} className="grid grid-cols-[1.3fr_1.5fr_0.8fr_1fr] gap-2 border-t border-rowdivider px-3 py-2 text-[12.5px]">
                      <div>{s.name}</div>
                      <div className="truncate">{s.email}</div>
                      <div>{s.role}</div>
                      <div className="font-mono">{s.tempPassword}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {departmentsNeedingHod.length > 0 && (
              <div className="mt-5 rounded-card border border-border bg-surface p-5">
                <div className="text-[13.5px] font-bold">Assign heads of department</div>
                <div className="mt-2 flex flex-col gap-2">
                  {departmentsNeedingHod.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3">
                      <div className="text-[13px] font-semibold">{d.name}</div>
                      <select
                        defaultValue=""
                        disabled={hodAssigning[d.id]}
                        onChange={(e) => assignHod(d.id, e.target.value ? Number(e.target.value) : null)}
                        className="rounded-[9px] border border-inputborder bg-sidebar px-3 py-2 text-[13px]"
                      >
                        <option value="">Choose HoD…</option>
                        {hodCandidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="rounded-card border border-border bg-surface p-5">
            <div className="text-[15px] font-bold">You're all set</div>
            <div className="mt-1 text-[13.5px] text-muted">
              {departments.length} department{departments.length === 1 ? '' : 's'}, {sessionStaff.length} staff member{sessionStaff.length === 1 ? '' : 's'} added.
              Save these temporary passwords now — they won't be shown again.
            </div>
            {sessionStaff.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-[9px] border border-border">
                <div className="grid grid-cols-[1.3fr_1.5fr_1fr] gap-2 bg-sidebar px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <div>Name</div>
                  <div>Email</div>
                  <div>Temp password</div>
                </div>
                {sessionStaff.map((s) => (
                  <div key={s.id} className="grid grid-cols-[1.3fr_1.5fr_1fr] gap-2 border-t border-rowdivider px-3 py-2 text-[12.5px]">
                    <div>{s.name}</div>
                    <div className="truncate">{s.email}</div>
                    <div className="font-mono">{s.tempPassword}</div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate(ROLE_HOME.hr)}
              className="mt-5 rounded-[10px] bg-primary px-[22px] py-2.5 text-[13.5px] font-bold text-appbg transition-colors hover:bg-primary-hover"
            >
              Go to LeaveFlow
            </button>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-[10px] border border-inputborder bg-white px-[18px] py-2.5 text-[13.5px] font-semibold text-ink-secondary disabled:opacity-40"
          >
            Back
          </button>
          {step < STEPS.length - 1 && (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="rounded-[10px] bg-primary px-[22px] py-2.5 text-[13.5px] font-bold text-appbg transition-colors hover:bg-primary-hover"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
