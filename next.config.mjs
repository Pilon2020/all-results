/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Hide the Next.js dev tools indicator button in the corner during development.
  devIndicators: false,
}

export default nextConfig
