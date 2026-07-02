const express = require('express');

const db = require('../db/database');

const { getSiteUrl } = require('../utils/seo');



const router = express.Router();



router.get('/robots.txt', (req, res) => {

  const base = getSiteUrl(req);

  res.type('text/plain').send(

    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /login\nDisallow: /register\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`

  );

});



router.get('/sitemap.xml', (req, res) => {

  const base = getSiteUrl(req);

  const gallery = db.prepare(`

    SELECT id, for_order, for_rent FROM gallery WHERE active = 1 ORDER BY sort_order ASC, id ASC

  `).all();



  const urls = [{ loc: '/', priority: '1.0', changefreq: 'weekly' }];



  for (const item of gallery) {

    if (item.for_order) {

      urls.push({ loc: `/order/${item.id}`, priority: '0.8', changefreq: 'weekly' });

    }

    if (item.for_rent) {

      urls.push({ loc: `/rent/${item.id}`, priority: '0.7', changefreq: 'weekly' });

    }

  }



  const body = urls.map((u) => `  <url>

    <loc>${base}${u.loc}</loc>

    <changefreq>${u.changefreq}</changefreq>

    <priority>${u.priority}</priority>

  </url>`).join('\n');



  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${body}

</urlset>`);

});



module.exports = router;

