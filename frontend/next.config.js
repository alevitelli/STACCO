/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
    images: {
        domains: ['your-image-domain.com', 'cdn.18tickets.net'],
    }
  }
  
  module.exports = nextConfig