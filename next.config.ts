import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 reactCompiler: true,
 
 // Configure images for Vercel
 images: {
  unoptimized: true,
 },
 
 // Enable trailing slashes for cleaner URLs
 trailingSlash: false,
 
 // Configure headers for security
 async headers() {
  return [
   {
    source: "/:path*",
    headers: [
     {
      key: "X-Frame-Options",
      value: "DENY",
     },
     {
      key: "X-Content-Type-Options",
      value: "nosniff",
     },
     {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
     },
    ],
   },
  ];
 },
};

export default nextConfig;
