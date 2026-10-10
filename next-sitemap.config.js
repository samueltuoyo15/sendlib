const config = {
  siteUrl: "https://sendliberty.com",
  generateRobotsTxt: false,
  generateIndexSitemap: false,
  exclude: ["/api/*", "/login", "/dashboard", "/dashboard/*"],
  changefreq: "daily",
  priority: 0.8,
  sitemapSize: 5000,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/login"],
      },
    ],
  },
};

export default config;
