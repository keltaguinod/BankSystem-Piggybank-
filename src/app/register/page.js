'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import PiggyLogo from '@/components/PiggyLogo';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Registration failed.');
        setBusy(false);
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      setSuccess('Account created successfully. Redirecting you to sign in...');
      router.replace(`/login?registered=1&email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err) {
      console.error('Registration request failed:', err);
      setError('Unable to register right now. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="auth-split">
      <div className="auth-form-side">
        <div className="auth-logo">
          <div className="mark"><PiggyLogo size={28} color="#ffffff" accent="#f0c419" /></div>
          <div className="name">BankSystem</div>
        </div>

        <h1 className="auth-h1">Create account</h1>
        <p className="auth-lead">Enter your details to start banking securely</p>

        {error && <div className="auth-alert" role="alert">{error}</div>}
        {success && <div className="auth-alert auth-alert-success" role="status">{success}</div>}

        <form onSubmit={submit}>
          <div className="auth-field">
            <label htmlFor="fullName">Full name</label>
            <div className="auth-input-wrap">
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                required
                maxLength={120}
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <div className="auth-input-wrap">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                maxLength={160}
                placeholder="johndoe@gmail.com"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <div className="auth-input-wrap">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                placeholder="12+ characters"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPw((visible) => !visible)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 13, margin: '-8px 0 24px' }}>
            Use upper and lowercase letters, a number, and a symbol.
          </p>

          <button className="auth-btn" disabled={busy}>
            {success ? 'Account created!' : busy ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="auth-bottom">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </div>

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
