import type { MetadataRoute } from "next";

// 폐쇄형 LMS — 모든 크롤러 색인 차단
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
