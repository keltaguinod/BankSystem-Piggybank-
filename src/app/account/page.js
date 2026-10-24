'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/lib/client';
import Shell from '@/components/Shell';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'PHP', 'AUD', 'CAD', 'SGD', 'CNY'];

export default function AccountPage() {
  const { user, loading, refresh } = useUser();
  const [form, setForm] = useState({ fullName: '', phone: '', address: '', currency: 'USD' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setForm({
      fullName: user.full_name || '', phone: user.phone || '',
      address: user.address || '', currency: user.currency || 'USD',
    });
  }, [user]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const payload = { ...form };
    if (pw.newPassword) { payload.currentPassword = pw.currentPassword; payload.newPassword = pw.newPassword; }
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: 'Account updated successfully.' });
      setPw({ currentPassword: '', newPassword: '' });
      refresh();
    } else setMsg({ type: 'error', text: data.error || 'Update failed.' });
    setBusy(false);
  }

  if (loading || !user) return null;

  return (
    <Shell user={user}>
      <div className="center-page">
        <div className="page-title">Account Management</div>
        <div className="page-sub">Update your personal information and security settings.</div>

        <div className="center-col center-col-wide">
        <div className="card card-pad">
        {msg && <div className={`alert ${msg.type}`} style={{ marginBottom: 18 }}>{msg.text}</div>}
        <form onSubmit={submit}>
          <div className="acct-grid">
            <div className="field">
              <label>Full name</label>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div className="field">
              <label>Email (read-only)</label>
              <input value={user.email} disabled style={{ background: 'var(--bg)', color: 'var(--muted)' }} />
            </div>
            <div className="field">
              <label>Your account number (read-only)</label>
              <input value={user.account_number || ''} disabled style={{ background: 'var(--bg)', color: 'var(--muted)', fontWeight: 700, letterSpacing: '1px' }} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" />
            </div>
            <div className="field">
              <label>Preferred currency</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field span-2">
              <label>Address</label>
              <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, City, Country" />
            </div>

            <div className="acct-section span-2">Change password</div>

            <div className="field">
              <label>Current password</label>
              <input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} placeholder="Required only to change password" />
            </div>
            <div className="field">
              <label>New password</label>
              <input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} placeholder="Leave blank to keep current" />
            </div>
          </div>

          <div className="btn-center" style={{ marginTop: 22 }}>
            <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
        </div>
        </div>
      </div>
    </Shell>
  );
}
