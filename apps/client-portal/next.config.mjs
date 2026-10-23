import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sandy/ui", "@sandy/shared-types", "@sandy/shared-utils"],
  reactStrictMode: true,
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
};

export default nextConfig;
