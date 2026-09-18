import type { MetadataRoute } from "next";

const BASE_URL = "https://biblioteca-digital-nine.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/"], disallow: ["/api/", "/auth/", "/estante/"] }],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
