'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, History, ArrowDownToLine, ArrowUpFromLine,
  UserCog, LogOut, Bell, ShieldCheck,
} from 'lucide-react';
import { money } from '@/lib/client';
import PiggyLogo from './PiggyLogo';
import UserSearch from './UserSearch';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/history', label: 'History', icon: History },
  { href: '/withdrawal', label: 'Withdrawal', icon: ArrowUpFromLine },
  { href: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
  { href: '/account', label: 'Account Management', icon: UserCog },
];

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || 'U';
}

export default function Shell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [now, setNow] = useState(new Date());
  const bellRef = useRef(null);
  const currency = user?.currency || 'USD';

  // Live clock for the header date & time.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load notifications (incoming money) and refresh periodically.
  useEffect(() => {
    let active = true;
    const load = () =>
      fetch('/api/notifications').then((r) => r.ok && r.json()).then((d) => { if (active && d) setNotifs(d.notifications || []); });
    load();
    const t = setInterval(load, 20000);
    return () => { active = false; clearInterval(t); };
  }, []);

  // Close dropdown on outside click.
  useEffect(() => {
    function onClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <div className="brand-name">BankSystem</div>
            <div className="brand-sub">Personal</div>
          </div>
        </div>

        {/* Avatar icon + account number only */}
        <div className="side-user">
          <div className="side-user-avatar">{initials(user?.full_name)}</div>
          <div className="side-user-acct">Acct {user?.account_number || '—'}</div>
        </div>

        <div className="nav-label">Menu</div>
        <nav className="nav">
          {[...NAV, ...(['admin', 'auditor'].includes(user?.role) ? [{ href: '/security', label: 'Security Center', icon: ShieldCheck }] : [])].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`nav-item ${pathname === href ? 'active' : ''}`}>
              <Icon size={19} strokeWidth={2.2} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="nav-label" style={{ marginTop: 18 }}>General</div>
        <nav className="nav">
          <button onClick={logout} className="nav-item" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.88)', width: '100%', textAlign: 'left' }}>
            <LogOut size={19} strokeWidth={2.2} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          {/* Greeting (left) */}
          <div className="topbar-greet">Hello, {user?.full_name || 'there'}!</div>

          {/* Search (center) */}
          <div className="topbar-search"><UserSearch /></div>

          <div className="topbar-right">
            {/* Date & time */}
            <div className="clock">
              <div className="time">{now.toLocaleTimeString()}</div>
              <div className="date">
                {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {/* Notification bell */}
            <div className="bell-wrap" ref={bellRef}>
              <button className="bell-btn" onClick={() => setNotifOpen((o) => !o)} aria-label="Notifications">
                <Bell size={20} color="#5b6577" />
                {notifs.length > 0 && <span className="bell-dot">{notifs.length}</span>}
              </button>
              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-head">Notifications</div>
                  {notifs.length === 0 ? (
                    <div className="notif-empty">No notifications yet.</div>
                  ) : (
                    notifs.map((n) => (
                      <div className="notif-item" key={n.id}>
                        <div className="notif-ico"><ArrowDownToLine size={16} /></div>
                        <div className="notif-body">
                          <div className="notif-text">
                            <strong>{n.counterparty_name || 'Someone'}</strong> sent you {money(n.amount, currency)}
                          </div>
                          <div className="notif-sub">Acct {n.counterparty_account} · {new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Piggy logo in the top-right corner */}
            <div className="topbar-logo"><PiggyLogo size={30} color="var(--maroon)" accent="#f0c419" /></div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
