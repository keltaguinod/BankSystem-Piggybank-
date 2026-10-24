'use client';

import { useEffect, useState } from 'react';
import { useUser, money } from '@/lib/client';
import Shell from '@/components/Shell';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

export default function HistoryPage() {
  const { user, loading } = useUser();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const currency = user?.currency || 'USD';

  function load(f) {
    const q = f === 'all' ? '' : `?type=${f}`;
    fetch(`/api/transactions${q}`).then((r) => r.ok && r.json()).then((d) => d && setRows(d.transactions));
  }

  useEffect(() => { if (user) load(filter); }, [user, filter]);

  if (loading || !user) return null;

  return (
    <Shell user={user}>
      <div className="page-title">Transaction History</div>
      <div className="page-sub">A complete record of every deposit and withdrawal.</div>

      <div className="card card-pad">
        <div className="card-head">
          <h3>All Records</h3>
          <div className="filter-tabs">
            {['all', 'deposit', 'withdrawal'].map((f) => (
              <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'deposit' ? 'Sent' : 'Received'}
              </button>
            ))}
          </div>
        </div>

        {rows.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="records">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Type</th>
                  <th>Counterparty</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  // deposit = money SENT (balance down, red, −)
                  // withdrawal = money RECEIVED (balance up, green, +)
                  const isSent = t.type === 'deposit';
                  return (
                    <tr key={t.id}>
                      <td>{new Date(t.created_at).toLocaleString()}</td>
                      <td>
                        <span className={`pill ${isSent ? 'out' : 'in'}`}>
                          {isSent ? <ArrowUpFromLine size={13} /> : <ArrowDownToLine size={13} />}
                          {isSent ? 'Sent' : 'Received'}
                        </span>
                      </td>
                      <td>
                        {t.counterparty_account
                          ? <div>
                              <div style={{ fontWeight: 600 }}>{t.counterparty_name || '—'}</div>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                                Acct {t.counterparty_account}{t.counterparty_email ? ` · ${t.counterparty_email}` : ''}
                              </div>
                            </div>
                          : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 700, color: isSent ? 'var(--red)' : 'var(--green)' }}>
                        {isSent ? '−' : '+'}{money(t.amount, currency)}
                      </td>
                      <td>{money(t.balance_after, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="empty">No records to show.</div>}
      </div>
    </Shell>
  );
}
