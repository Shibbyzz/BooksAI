/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')(
  // This is the default location for the i18n config
  './src/lib/i18n.ts'
);

const nextConfig = {
  serverExternalPackages: ['@supabase/supabase-js'],
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = withNextIntl(nextConfig)
