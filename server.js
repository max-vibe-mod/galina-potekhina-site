require('dotenv').config({ path: '.env.local' });

const express = require('express');
const session = require('express-session');
const path = require('path');

const { ready: initDb } = require('./db/database');
const { attachUser } = require('./middleware/auth');
const { getSettings } = require('./utils/settings');
const { getSocialLinks } = require('./utils/socialLinks');
const { expireOldBonuses } = require('./utils/loyalty');
const { getSiteUrl, pageMeta, homeMeta, buildJsonLd } = require('./utils/seo');
const { formatPhoneDisplay, phoneTelHref } = require('./utils/formatPhone');

const PORT = process.env.PORT || 3000;

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err?.message || err);
});

async function start() {
  const db = await initDb();

  const { setSetting } = require('./utils/settings');
  const { ensureEveningGallery } = require('./utils/seedEveningGallery');
  const { syncRentPrices } = require('./utils/syncRentPrices');
  setSetting('rental_title', 'Аренда платьев');
  setSetting('rental_text', 'Арендуйте авторские платья студии для съёмок, мероприятий и особых случаев. Каждое платье — единственное в своём исполнении.');
  setSetting('rental_how_text', 'Выберите платье, заполните заявку на сайте — рассчитаем аренду по дням или неделям и сформируем проект договора. Подпись Галины — при выдаче в студии.');

  ensureEveningGallery();
  syncRentPrices();

  const authRoutes = require('./routes/auth');
  const adminRoutes = require('./routes/admin');
  const shopRoutes = require('./routes/shop');
  const accountRoutes = require('./routes/account');
  const seoRoutes = require('./routes/seo');

  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
  app.get('/logo.jpg', (_req, res) => res.redirect(301, '/logo.png'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use(session({
    secret: process.env.SESSION_SECRET || 'gp-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  }));

  app.use(attachUser);

  app.use((req, res, next) => {
    const settings = getSettings();
    const socialLinks = getSocialLinks(settings);
    const siteUrl = getSiteUrl(req);
    res.locals.settings = settings;
    res.locals.socialLinks = socialLinks;
    res.locals.siteUrl = siteUrl;
    res.locals.meta = res.locals.meta || pageMeta();
    res.locals.jsonLd = buildJsonLd(settings, siteUrl, socialLinks);
    res.locals.formatPhone = formatPhoneDisplay;
    res.locals.phoneHref = phoneTelHref;
    next();
  });

  app.use('/', seoRoutes);

  app.get('/', (req, res) => {
    expireOldBonuses();
    const eveningGallery = db.prepare(`
      SELECT * FROM gallery
      WHERE active = 1 AND category = 'evening_couture'
      ORDER BY sort_order ASC, id ASC
    `).all();
    res.render('index', {
      title: 'Galina Potekhina',
      meta: homeMeta(),
      isHome: true,
      eveningGallery
    });
  });

  app.use('/', authRoutes);
  app.use('/', shopRoutes);
  app.use('/', accountRoutes);
  app.use('/admin', adminRoutes);

  app.use((req, res) => {
    res.status(404).render('error', { title: '404', message: 'Страница не найдена', user: res.locals.user });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error', { title: 'Ошибка', message: err.message || 'Внутренняя ошибка', user: res.locals.user });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║   Galina Potekhina — сайт запущен!       ║');
    console.log('  ╠══════════════════════════════════════════╣');
    console.log(`  ║   http://localhost:${PORT}                    ║`);
    console.log('  ║   Админ: admin / (см. .env.local)        ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
  });
}

start().catch(err => {
  console.error('Ошибка запуска:', err);
  process.exit(1);
});
