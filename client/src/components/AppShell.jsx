import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrganisation } from '../context/OrganisationContext';
import { NAV_BY_ROLE } from '../lib/roles';
import NewRequestModal from './NewRequestModal';
import DetailModal from './DetailModal';
import Toast from './Toast';

export default function AppShell() {
  const { user, logout } = useAuth();
  const { orgName } = useOrganisation();
  const navItems = NAV_BY_ROLE[user.role] || [];

  return (
    <div className="flex h-screen min-h-[600px] flex-col bg-appbg">
      <header className="flex h-[60px] flex-shrink-0 items-center gap-3 bg-dark px-4 sm:gap-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-gold font-display text-[15px] font-bold text-dark">
            LF
          </div>
          <div className="font-display text-[17px] font-semibold tracking-tight text-appbg">LeaveFlow</div>
        </div>
        <div className="hidden h-6 w-px bg-white/20 sm:block" />
        <div className="hidden max-w-[340px] overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium text-white/75 sm:block">
          {orgName}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5">
          <div className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-full border-2 border-white/30 bg-primary text-[12px] font-bold text-appbg">
            {user.initials}
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-[13px] font-semibold text-appbg">{user.name}</div>
            <div className="text-[11px] text-white/55">{user.title}</div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-white/25 bg-transparent px-3 py-1.5 text-[11.5px] font-bold text-white/70 transition-colors hover:bg-black/25"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-[216px] flex-shrink-0 flex-col border-r border-border bg-sidebar p-3 md:flex">
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${
                    isActive ? 'text-[#16453A]' : 'text-ink-secondary hover:bg-subtle'
                  }`
                }
                style={({ isActive }) => (isActive ? { background: '#E2F0E9', color: '#16453A' } : undefined)}
              >
                <span className="w-[18px] text-center text-[15px]">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="flex-1" />
          <div className="rounded-[10px] border border-[#E2DFD5] bg-subtle p-3">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">Need help?</div>
            <div className="text-[12px] leading-[1.45] text-ink-secondary">
              Contact HR for questions about your leave entitlement or policies.
            </div>
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-8 sm:pb-7 md:pb-7">
          <div className="mx-auto max-w-[1060px] animate-fadeUp">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-sidebar md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                isActive ? 'text-[#16453A]' : 'text-ink-secondary'
              }`
            }
          >
            <span className="text-[16px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <NewRequestModal />
      <DetailModal />
      <Toast />
    </div>
  );
}
