import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@takumi-rs/image-response'],
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: path.resolve(__dirname, ".."),
    resolveAlias: {
      "@oscli-dev/oscli": path.resolve(__dirname, "../packages/oscli/src/index.ts"),
      "@oscli-dev/react": path.resolve(__dirname, "../packages/react/src/index.ts"),
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@oscli-dev/oscli": path.resolve(__dirname, "../packages/oscli/src/index.ts"),
      "@oscli-dev/react": path.resolve(__dirname, "../packages/react/src/index.ts"),
    };

    return config;
  },
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },
    ];
  },
};

export default withMDX(config);
