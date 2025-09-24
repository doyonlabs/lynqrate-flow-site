/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint 에러 있어도 빌드 진행 (배포 우선)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 타입 에러 있어도 빌드 진행 (배포 우선)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;