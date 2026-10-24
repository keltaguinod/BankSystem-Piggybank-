'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

// Header search: find other users by account number, email, or name.
export default function UserSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const id = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.ok && r.json())
        .then((d) => { if (d) { setResults(d.results); setOpen(true); } });
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  function copy(acct) {
    navigator.clipboard?.writeText(acct);
    setCopied(acct);
    setTimeout(() => setCopied(''), 1500);
  }

  return (
    <div className="dash-search">
      <div className="dash-search-box">
        <Search size={18} color="#98a1b2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Find an account by number, email, or name…"
        />
        {q && <button className="dash-search-clear" onMouseDown={(e) => { e.preventDefault(); setQ(''); setOpen(false); }}><X size={16} /></button>}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="dash-search-results">
          {results.length === 0 ? (
            <div className="notif-empty">No accounts found.</div>
          ) : (
            results.map((u) => (
              <button className="dash-result" key={u.account_number} onMouseDown={(e) => { e.preventDefault(); copy(u.account_number); }}>
                <div className="avatar" style={{ background: 'var(--maroon-soft)', color: 'var(--maroon)', width: 34, height: 34 }}>
                  {u.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="dash-result-meta">
                  <div className="dash-result-name">{u.full_name}</div>
                  <div className="dash-result-sub">Acct {u.account_number} · {u.email}</div>
                </div>
                <span className="dash-result-copy">{copied === u.account_number ? 'Copied!' : 'Copy #'}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
