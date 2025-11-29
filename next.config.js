/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,  // 保持关着
    swcMinify: false,        // 关压缩
    poweredByHeader: false,  // 可选，少点干扰
    // 关键：强制生产用dev模式
    webpack: (config, { dev, isServer }) => {
      if (!dev && !isServer) {
        // 生产客户端bundle用dev React
        config.resolve.alias = {
          ...config.resolve.alias,
          'react-dom$': 'react-dom/development.js',
          'react$': 'react/development.js',
        };
      }
      return config;
    },
  };
  
  module.exports = nextConfig;