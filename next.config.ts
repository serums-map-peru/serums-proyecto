import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "app20.susalud.gob.pe",
        port: "8080",
        pathname: "/registro-renipress-webapp/**",
      },
      {
        protocol: "https",
        hostname: "app20.susalud.gob.pe",
        port: "8080",
        pathname: "/registro-renipress-webapp/**",
      },
    ],
  },
};

export default nextConfig;
