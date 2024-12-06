/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
    images: {
        domains: ['your-image-domain.com'],
    }
  }
  
  module.exports = nextConfig