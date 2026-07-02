const express = require('express');

const db = require('../db/database');

const { getSiteUrl } = require('../utils/seo');

const router = express.Router();

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

router.get('/robots.txt', (req, res) => {
  const base = getSiteUrl(req);

  res.type('text/plain').send(
    `User-agent: *
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /login
Disallow: /register
Disallow: /api/

User-agent: Yandex
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /api/

User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /api/

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${base}/sitemap.xml
`
  );
});

router.get('/sitemap.xml', (req, res) => {
  const base = getSiteUrl(req);
  const today = todayIso();
  const gallery = db.prepare(`
    SELECT id, for_order, for_rent, created_at FROM gallery WHERE active = 1 ORDER BY sort_order ASC, id ASC
  `).all();

  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'weekly', lastmod: today }
  ];

  for (const item of gallery) {
    const lastmod = item.created_at ? String(item.created_at).slice(0, 10) : today;
    if (item.for_order) {
      urls.push({ loc: `/order/${item.id}`, priority: '0.8', changefreq: 'weekly', lastmod });
    }
    if (item.for_rent) {
      urls.push({ loc: `/rent/${item.id}`, priority: '0.75', changefreq: 'weekly', lastmod });
    }
  }

  const body = urls.map((u) => `  <url>
    <loc>${base}${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`);
});

module.exports = router;
