import { NextResponse } from 'next/server';

// Free, key-less FX rates via open.er-api.com. ?base=USD
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const base = (searchParams.get('base') || 'USD').toUpperCase();
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    if (data.result !== 'success') {
      return NextResponse.json({ error: 'Rates unavailable.' }, { status: 502 });
    }
    const wanted = ['USD', 'EUR', 'GBP', 'JPY', 'PHP', 'AUD', 'CAD', 'SGD', 'CNY'];
    const rates = {};
    for (const code of wanted) {
      if (data.rates[code] != null) rates[code] = data.rates[code];
    }
    return NextResponse.json({ base, rates, updated: data.time_last_update_utc });
  } catch (err) {
    return NextResponse.json({ error: 'Rates unavailable.' }, { status: 502 });
  }
}
