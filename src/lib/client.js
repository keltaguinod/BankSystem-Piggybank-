'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refresh() {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    } else {
      router.push('/login');
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  return { user, setUser, loading, refresh };
}

const SYMBOLS = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', PHP: '₱', AUD: 'A$', CAD: 'C$', SGD: 'S$', CNY: '¥' };

export function money(amount, currency = 'USD') {
  const n = Number(amount || 0);
  const sym = SYMBOLS[currency] || '';
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
