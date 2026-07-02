import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cloudinary (profile picture uploads)
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Google OAuth avatars
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Supabase Storage (if used for avatars)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
