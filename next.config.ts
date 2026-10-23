import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "satori"],
  // The server keeps a Python venv at ./venv for the Bale bot. Do not trace it into the Next bundle.
  outputFileTracingExcludes: {
    "/*": ["./venv/**", "./.venv/**", "./python_car_hunter/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
