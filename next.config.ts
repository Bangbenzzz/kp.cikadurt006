import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  experimental: {
    serverActions: {
      allowedOrigins: [
        "3000-firebase-webapp-1763293898035.cluster-ulqnojp5endvgve6krhe7klaws.cloudworkstations.dev",
      ],
    },
  },

};

export default nextConfig;