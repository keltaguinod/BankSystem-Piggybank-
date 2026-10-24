'use client';

import { useEffect, useState } from 'react';
import { useUser, money } from '@/lib/client';
import Shell from '@/components/Shell';
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine, Activity, CloudSun, Eye, EyeOff,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

export default function DashboardPage() {
  const { user, loading } = useUser();
  const [data, setData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [fx, setFx] = useState(null);
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('PHP');
  const [showAcct, setShowAcct] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.ok && r.json()).then((d) => d && setData(d));
    fetch('/api/external/currency?base=USD').then((r) => r.ok && r.json()).then((d) => d && setFx(d));
    const load = (lat, lon) =>
      fetch(`/api/external/weather?lat=${lat}&lon=${lon}`).then((r) => r.ok && r.json()).then((d) => d && setWeather(d));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        () => load(14.6488, 121.0509)
      );
    } else load(14.6488, 121.0509);
  }, []);

  if (loading || !user) return null;

  const currency = data?.currency || user.currency || 'USD';

  const converted = (() => {
    if (!fx?.rates) return null;
    const rFrom = from === 'USD' ? 1 : fx.rates[from];
    const rTo = to === 'USD' ? 1 : fx.rates[to];
    if (!rFrom || !rTo) return null;
    return (Number(amount) / rFrom) * rTo;
  })();

  const codes = ['USD', 'EUR', 'GBP', 'JPY', 'PHP', 'AUD', 'CAD', 'SGD', 'CNY'];

  return (
    <Shell user={user}>
      <div className="dash-greet">
        <div className="page-title" style={{ fontSize: 22 }}>Piggy, save to make it your own</div>
      </div>

      {/* Current Balance | Transactions */}
      <div className="stat-grid stat-grid-2">
        <div className="stat s-balance">
          <div className="label">Current Balance</div>
          <div className="value">{money(data?.balance, currency)}</div>
          <div className="acct-sub">
            <span>Acct {showAcct ? user.account_number : '•••• ••••'}</span>
            <button className="acct-toggle" onClick={() => setShowAcct((s) => !s)} type="button">
              {showAcct ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="ico"><Wallet size={22} /></div>
        </div>
        <div className="stat s-count">
          <div className="label">Transactions</div>
          <div className="value">{data?.summary?.tx_count ?? 0}</div>
          <div className="ico"><Activity size={22} /></div>
        </div>
      </div>

      {/* Annual trend + weather */}
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card card-pad">
          <div className="card-head"><h3>Annual Trends</h3>
            <span className="page-sub" style={{ margin: 0 }}>Last 12 months</span>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={data?.trend || []} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2bb673" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2bb673" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7a1a1a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7a1a1a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#98a1b2" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#98a1b2" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="deposits" name="Sent" stroke="#2bb673" strokeWidth={2.5} fill="url(#gDep)" />
                <Area type="monotone" dataKey="withdrawals" name="Received" stroke="#7a1a1a" strokeWidth={2.5} fill="url(#gWd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-head"><h3>Weather</h3><CloudSun size={20} color="#f5a623" /></div>
          {weather ? (
            <div className="weather">
              <div className="temp">{Math.round(weather.temperature)}°</div>
              <div>
                <div className="wdesc">{weather.description}</div>
                <div className="wmeta">Humidity {weather.humidity}% · Wind {weather.wind} km/h</div>
              </div>
            </div>
          ) : <div className="muted-note">Loading weather…</div>}

          <div style={{ height: 1, background: 'var(--line)', margin: '20px 0' }} />

          <div className="card-head" style={{ marginBottom: 12 }}><h3 style={{ fontSize: 15 }}>Currency Exchange</h3></div>
          <div className="fx-converter">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {codes.map((c) => <option key={c}>{c}</option>)}
            </select>
            <span style={{ color: 'var(--muted)' }}>→</span>
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {codes.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="fx-result">
            {converted != null ? `${Number(amount).toLocaleString()} ${from} = ${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}` : 'Loading rates…'}
          </div>
        </div>
      </div>

      {/* Recent transactions + rates table */}
      <div className="grid-2b">
        <div className="card card-pad">
          <div className="card-head"><h3>Recent Transactions</h3></div>
          {data?.recent?.length ? (
            <div className="tx-list">
              {data.recent.map((t) => {
                // deposit = sent (out), withdrawal = received (in)
                const isSent = t.type === 'deposit';
                return (
                  <div className="tx-item" key={t.id}>
                    <div className={`tx-ico ${isSent ? 'out' : 'in'}`}>
                      {isSent ? <ArrowUpFromLine size={18} /> : <ArrowDownToLine size={18} />}
                    </div>
                    <div className="tx-meta">
                      <div className="tx-desc">
                        {isSent ? 'Sent to ' : 'Received from '}{t.counterparty_name || t.counterparty_account || '—'}
                      </div>
                      <div className="tx-date">{new Date(t.created_at).toLocaleString()}</div>
                    </div>
                    <div className={`tx-amt ${isSent ? 'out' : 'in'}`}>
                      {isSent ? '−' : '+'}{money(t.amount, currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="empty">No transactions yet.</div>}
        </div>

        <div className="card card-pad">
          <div className="card-head"><h3>Exchange Rates</h3>
            <span className="page-sub" style={{ margin: 0 }}>Base USD</span>
          </div>
          {fx?.rates ? (
            <div>
              {codes.filter((c) => c !== 'USD').map((c) => (
                <div className="fx-row" key={c}>
                  <span className="fx-code">{c}</span>
                  <span className="fx-rate">{fx.rates[c]?.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                </div>
              ))}
            </div>
          ) : <div className="muted-note">Loading rates…</div>}
        </div>
      </div>
    </Shell>
  );
}
