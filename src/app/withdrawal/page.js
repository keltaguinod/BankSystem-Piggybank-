'use client';

import { useState } from 'react';
import { useUser, money } from '@/lib/client';
import Shell from '@/components/Shell';

export default function WithdrawalPage() {
  const { user, loading, refresh } = useUser();
  const [amount, setAmount] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const currency = user?.currency || 'USD';

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await fetch('/api/transactions/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currentPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: `Withdrew ${money(amount, currency)}. New balance: ${money(data.balance, currency)}.` });
      setAmount(''); setCurrentPassword(''); refresh();
    } else setMsg({ type: 'error', text: data.error || 'Failed.' });
    setBusy(false);
  }

  if (loading || !user) return null;

  return (
    <Shell user={user}>
      <div className="center-page">
        <div className="page-title">Withdrawal</div>
        <div className="page-sub">Withdraw funds securely from your own account.</div>

        <div className="center-col">
          <div className="balance-banner">
            <div className="lbl">Your Balance · Acct {user.account_number}</div>
            <div className="amt">{money(user.balance, currency)}</div>
          </div>

          <div className="card card-pad">
            {msg && <div className={`alert ${msg.type}`} style={{ marginBottom: 18 }}>{msg.text}</div>}
            <form className="form" onSubmit={submit}>
              <div className="field">
                <label>Amount ({currency})</label>
                <input type="number" min="0.01" step="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" />
              </div>
              <div className="field">
                <label>Confirm your password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" placeholder="Required for withdrawal" />
              </div>
              <div className="btn-center">
                <button className="btn" disabled={busy}>{busy ? 'Processing…' : 'Withdraw money'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Shell>
  );
}
