import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.101.130"],
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
