const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14 không cần appDir nữa vì App Router là mặc định
};

module.exports = withNextIntl(nextConfig);

