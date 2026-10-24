'use client';

import { useState } from 'react';
import { useUser, money } from '@/lib/client';
import Shell from '@/components/Shell';

export default function DepositPage() {
  const { user, loading, refresh } = useUser();
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const currency = user?.currency || 'USD';

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await fetch('/api/transactions/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, account, name, email }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: 'success', text: `Sent ${money(amount, currency)} to ${data.recipient}. New balance: ${money(data.balance, currency)}.` });
      setAmount(''); setAccount(''); setName(''); setEmail(''); refresh();
    } else setMsg({ type: 'error', text: data.error || 'Failed.' });
    setBusy(false);
  }

  if (loading || !user) return null;

  return (
    <Shell user={user}>
      <div className="center-page">
        <div className="page-title">Deposit — Send Money</div>
        <div className="page-sub">Transfer money to another account.</div>

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
                <label>Recipient account number</label>
                <input value={account} onChange={(e) => setAccount(e.target.value)} required placeholder="Account you're sending to" />
              </div>
              <div className="field">
                <label>Recipient name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" />
              </div>
              <div className="field">
                <label>Recipient email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" />
              </div>
              <div className="btn-center">
                <button className="btn" disabled={busy}>{busy ? 'Processing…' : 'Send money'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Shell>
  );
}
