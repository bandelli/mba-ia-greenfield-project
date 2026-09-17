import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal, self-contained production server bundle — required by the
  // production Dockerfile's runtime stage (home-search-launch/TD-05).
  output: "standalone",
};

export default nextConfig;
