'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import PiggyLogo from '@/components/PiggyLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [keep, setKeep] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRegistered(params.get('registered') === '1');

    const registeredEmail = params.get('email');
    if (registeredEmail) setEmail(registeredEmail);
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember: keep }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Login failed.');
        return;
      }

      window.location.assign('/dashboard');
    } catch (err) {
      console.error('Login request failed:', err);
      setError('Unable to sign in right now. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-split">
      {/* Left: form */}
      <div className="auth-form-side">
        <div className="auth-logo">
          <div className="mark"><PiggyLogo size={28} color="#ffffff" accent="#f0c419" /></div>
          <div className="name">BankSystem</div>
        </div>

        <h1 className="auth-h1">Welcome back</h1>
        <p className="auth-lead">Please enter your account details</p>

        {error && <div className="auth-alert">{error}</div>}
        {registered && (
          <div className="auth-alert auth-alert-success" role="status">
            Account created successfully. You can now sign in.
          </div>
        )}

        <form onSubmit={submit}>
          <div className="auth-field">
            <label>Email</label>
            <div className="auth-input-wrap">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="Johndoe@gmail.com" />
            </div>
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrap">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
              <button type="button" className="auth-eye" onClick={() => setShowPw(!showPw)} aria-label="Toggle password">
                {showPw ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <div className="auth-row">
            <label className="auth-check">
              <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
              Keep me logged in
            </label>
            <Link href="#" className="auth-link">Forgot Password</Link>
          </div>

          <button className="auth-btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>

        <div className="auth-divider">or continue with</div>

        <div className="auth-bottom">
          New here? <Link href="/register">Create an account</Link>
        </div>
      </div>

      {/* Right: showcase */}
      <div className="auth-showcase">
        <div className="showcase-card">
          <div className="showcase-spin">
            <PiggyLogo size={120} color="#ffffff" accent="#f0c419" />
          </div>
          <h2 className="showcase-title" style={{ marginBottom: 0, fontSize: 52 }}>PiggyBank</h2>
        </div>
      </div>
    </div>
  );
}
