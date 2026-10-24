/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  // The surrounding workspace has a TanStack-specific ESLint config that does not parse this
  // extracted Next.js app. Keep compilation/type validation in the build and lint separately.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    // Next.js development mode uses eval for React Fast Refresh. Without this
    // development-only allowance, pages render but client event handlers never
    // hydrate (including the registration form submit handler).
    const scriptSrc = process.env.NODE_ENV === 'production'
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; ${scriptSrc}; connect-src 'self' https://api.open-meteo.com https://open.er-api.com` },
        ...(process.env.NODE_ENV === 'production'
          ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
          : []),
      ],
    }];
  },
};

module.exports = nextConfig;
