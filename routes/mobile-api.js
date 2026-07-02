const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { requireMobileKey } = require('../middleware/mobileAuth');
const { getSettings, setSetting } = require('../utils/settings');
const { isAllowedImage, resolveImageExt } = require('../utils/upload');
const { suggestRentPrices } = require('../utils/rentPricing');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'gp-mobile-api' });
});

const eveningDir = path.join(__dirname, '..', 'public', 'uploads', 'evening');
if (!fs.existsSync(eveningDir)) fs.mkdirSync(eveningDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, eveningDir),
    filename: (_req, file, cb) => {
      const ext = resolveImageExt(file);
      cb(null, `mobile-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedImage(file)) return cb(null, true);
    cb(new Error('Допустимые форматы: JPG, PNG, WEBP'));
  }
});

router.use(requireMobileKey);

router.get('/ping', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

router.get('/bootstrap', (_req, res) => {
  const gallery = db.prepare(`
    SELECT * FROM gallery
    WHERE category = 'evening_couture'
    ORDER BY sort_order ASC, id ASC
  `).all();

  const settings = getSettings();
  const counts = {
    ordersNew: db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'new'`).get().c,
    rentalsNew: db.prepare(`SELECT COUNT(*) as c FROM rental_bookings WHERE status = 'new'`).get().c,
    mediaPending: db.prepare(`
      SELECT COUNT(*) as c FROM orders
      WHERE media_request_status = 'pending' OR change_request_status = 'pending'
    `).get().c
  };

  res.json({
    gallery,
    settings: {
      phone: settings.phone,
      hero_title: settings.hero_title,
      hero_subtitle: settings.hero_subtitle,
      about_title: settings.about_title,
      about_text: settings.about_text,
      rental_title: settings.rental_title,
      rental_text: settings.rental_text,
      telegram: settings.telegram,
      whatsapp: settings.whatsapp,
      instagram: settings.instagram,
      max: settings.max
    },
    counts,
    telegramConfigured: Boolean(process.env.ADMIN_TELEGRAM_BOT_TOKEN && process.env.ADMIN_TELEGRAM_CHAT_ID)
  });
});

router.get('/events', (req, res) => {
  const since = req.query.since || '1970-01-01 00:00:00';
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

  const orders = db.prepare(`
    SELECT id, product_title, customer_name, phone, email, amount, status, created_at
    FROM orders
    WHERE datetime(created_at) > datetime(?)
    ORDER BY created_at DESC
    LIMIT ?
  `).all(since, limit);

  const rentals = db.prepare(`
    SELECT id, item_title, customer_name, phone, email, amount, rent_from, rent_to, status, created_at
    FROM rental_bookings
    WHERE datetime(created_at) > datetime(?)
    ORDER BY created_at DESC
    LIMIT ?
  `).all(since, limit);

  const recentOrders = db.prepare(`
    SELECT id, product_title, customer_name, phone, amount, status, created_at
    FROM orders ORDER BY created_at DESC LIMIT 15
  `).all();

  const recentRentals = db.prepare(`
    SELECT id, item_title, customer_name, phone, amount, rent_from, rent_to, status, created_at
    FROM rental_bookings ORDER BY created_at DESC LIMIT 15
  `).all();

  res.json({
    orders,
    rentals,
    recentOrders,
    recentRentals,
    counts: {
      ordersNew: db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'new'`).get().c,
      rentalsNew: db.prepare(`SELECT COUNT(*) as c FROM rental_bookings WHERE status = 'new'`).get().c,
      mediaPending: db.prepare(`
        SELECT COUNT(*) as c FROM orders
        WHERE media_request_status = 'pending' OR change_request_status = 'pending'
      `).get().c
    }
  });
});

router.post('/gallery', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Ошибка загрузки' });
    next();
  });
}, async (req, res) => {
  try {
    const title = (req.body.title || '').trim();
    const description = (req.body.description || '').trim();
    const price = parseFloat(req.body.price) || 0;

    if (!title) return res.status(400).json({ error: 'Укажите название' });
    if (!req.file) return res.status(400).json({ error: 'Выберите фото' });

    const { resizeGalleryImage } = require('../utils/resizeGalleryImage');
    const processedPath = path.join(eveningDir, `processed-${Date.now()}.jpg`);
    await resizeGalleryImage(req.file.path, processedPath);
    if (fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
    }
    const finalName = path.basename(processedPath);
    const imagePath = `/uploads/evening/${finalName}`;
    const { rent_price_day, rent_price_week } = suggestRentPrices(price);
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM gallery').get().m;

    const result = db.prepare(`
      INSERT INTO gallery (
        title, description, price, image_path, active, sort_order,
        for_order, for_rent, rent_price_day, rent_price_week, category
      ) VALUES (?, ?, ?, ?, 1, ?, 1, 1, ?, ?, 'evening_couture')
    `).run(title, description, price, imagePath, maxSort + 1, rent_price_day, rent_price_week);

    res.json({
      ok: true,
      item: db.prepare('SELECT * FROM gallery WHERE id = ?').get(result.lastInsertRowid)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/gallery/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Платье не найдено' });

  const title = (req.body.title ?? item.title).toString().trim();
  const description = (req.body.description ?? item.description ?? '').toString().trim();
  const price = parseFloat(req.body.price ?? item.price) || 0;
  const active = req.body.active === undefined ? item.active : (req.body.active ? 1 : 0);
  const forOrder = req.body.for_order === undefined ? item.for_order : (req.body.for_order ? 1 : 0);
  const forRent = req.body.for_rent === undefined ? item.for_rent : (req.body.for_rent ? 1 : 0);

  let rentDay = parseFloat(req.body.rent_price_day ?? item.rent_price_day) || 0;
  let rentWeek = parseFloat(req.body.rent_price_week ?? item.rent_price_week) || 0;
  if (req.body.price !== undefined && req.body.rent_price_day === undefined) {
    const rent = suggestRentPrices(price);
    rentDay = rent.rent_price_day;
    rentWeek = rent.rent_price_week;
  }

  db.prepare(`
    UPDATE gallery SET title = ?, description = ?, price = ?, active = ?,
      for_order = ?, for_rent = ?, rent_price_day = ?, rent_price_week = ?
    WHERE id = ?
  `).run(title, description, price, active, forOrder, forRent, rentDay, rentWeek, item.id);

  res.json({ ok: true, item: db.prepare('SELECT * FROM gallery WHERE id = ?').get(item.id) });
});

router.post('/gallery/:id/photo', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Ошибка загрузки' });
    next();
  });
}, async (req, res) => {
  try {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Платье не найдено' });
  if (!req.file) return res.status(400).json({ error: 'Выберите фото' });

  const oldRel = (item.image_path || '').replace(/^\//, '');
  const oldPath = path.join(__dirname, '..', 'public', oldRel);
  if (fs.existsSync(oldPath)) {
    try { fs.unlinkSync(oldPath); } catch (_) { /* ignore */ }
  }

  const { resizeGalleryImage } = require('../utils/resizeGalleryImage');
  const processedPath = path.join(eveningDir, `processed-${Date.now()}.jpg`);
  await resizeGalleryImage(req.file.path, processedPath);
  if (fs.existsSync(req.file.path)) {
    try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
  }

  const imagePath = `/uploads/evening/${path.basename(processedPath)}`;
  db.prepare('UPDATE gallery SET image_path = ? WHERE id = ?').run(imagePath, item.id);

  res.json({
    ok: true,
    item: db.prepare('SELECT * FROM gallery WHERE id = ?').get(item.id)
  });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gallery/:id/toggle', (req, res) => {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Платье не найдено' });
  const nextActive = item.active ? 0 : 1;
  db.prepare('UPDATE gallery SET active = ? WHERE id = ?').run(nextActive, item.id);
  res.json({ ok: true, active: nextActive });
});

router.delete('/gallery/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Платье не найдено' });

  const oldRel = (item.image_path || '').replace(/^\//, '');
  const oldPath = path.join(__dirname, '..', 'public', oldRel);
  if (fs.existsSync(oldPath)) {
    try { fs.unlinkSync(oldPath); } catch (_) { /* ignore */ }
  }

  db.prepare('DELETE FROM gallery WHERE id = ?').run(item.id);
  res.json({ ok: true });
});

router.post('/settings', (req, res) => {
  const allowed = [
    'phone', 'hero_title', 'hero_subtitle', 'about_title', 'about_text',
    'rental_title', 'rental_text', 'telegram', 'whatsapp', 'instagram', 'max'
  ];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      setSetting(key, String(req.body[key]).trim());
    }
  }

  res.json({ ok: true, settings: getSettings() });
});

router.post('/orders/:id/status', (req, res) => {
  const status = (req.body.status || '').trim();
  const allowed = ['new', 'confirmed', 'in_progress', 'ready', 'completed', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id);
  res.json({ ok: true, order: db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) });
});

router.post('/rentals/:id/status', (req, res) => {
  const status = (req.body.status || '').trim();
  const allowed = ['new', 'confirmed', 'active', 'completed', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }

  const booking = db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Аренда не найдена' });

  db.prepare('UPDATE rental_bookings SET status = ? WHERE id = ?').run(status, booking.id);
  res.json({
    ok: true,
    booking: db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(booking.id)
  });
});

router.delete('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
  res.json({ ok: true });
});

router.post('/orders/:id/delete', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
  res.json({ ok: true });
});

router.delete('/rentals/:id', (req, res) => {
  const booking = db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Аренда не найдена' });
  db.prepare('DELETE FROM rental_bookings WHERE id = ?').run(booking.id);
  res.json({ ok: true });
});

router.post('/rentals/:id/delete', (req, res) => {
  const booking = db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Аренда не найдена' });
  db.prepare('DELETE FROM rental_bookings WHERE id = ?').run(booking.id);
  res.json({ ok: true });
});

module.exports = router;
