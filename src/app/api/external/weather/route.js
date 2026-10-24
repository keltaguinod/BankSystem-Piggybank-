import { NextResponse } from 'next/server';

// Free, key-less weather via Open-Meteo. Accepts ?lat=&lon=.
const CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow',
  75: 'Heavy snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Thunderstorm w/ hail',
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat') || '14.6488'; // Quezon City default
    const lon = searchParams.get('lon') || '121.0509';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    const data = await res.json();
    const c = data.current || {};
    return NextResponse.json({
      temperature: c.temperature_2m,
      humidity: c.relative_humidity_2m,
      wind: c.wind_speed_10m,
      code: c.weather_code,
      description: CODES[c.weather_code] ?? 'Unknown',
    });
  } catch (err) {
    return NextResponse.json({ error: 'Weather unavailable.' }, { status: 502 });
  }
}
