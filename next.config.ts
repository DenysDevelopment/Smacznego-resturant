import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host
  } catch {
    return ''
  }
})()

const isProd = process.env.NODE_ENV === 'production'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // CSP/HSTS prod-only: dev needs Turbopack's eval and HMR websockets
  ...(isProd
    ? [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            `img-src 'self' data: blob:${supabaseHost ? ` https://${supabaseHost} http://${supabaseHost}` : ''}`,
            `connect-src 'self'${supabaseHost ? ` https://${supabaseHost} http://${supabaseHost} wss://${supabaseHost}` : ''}`,
            "font-src 'self' data:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
      ]
    : []),
]

const supabaseUrl = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  } catch {
    return null
  }
})()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol.replace(':', '') as 'http' | 'https',
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
  experimental: {
    serverActions: {
      // dish photo uploads (4 MB cap + multipart overhead)
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
};

export default withNextIntl(nextConfig);
