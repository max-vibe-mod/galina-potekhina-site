const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { getSettings, setSetting } = require('../utils/settings');
const { requireAdmin } = require('../middleware/auth');
const {
  getActiveBonusBalance,
  getBonusHistory,
  getBonusAdjustments,
  getBonusStats,
  expireOldBonuses,
  adminAddBonus,
  adminDeductBonus,
  adminResetBonuses,
  adminSetBonusBalance
} = require('../utils/loyalty');

const { pageMeta } = require('../utils/seo');

const router = express.Router();
router.use(requireAdmin);
router.use((req, res, next) => {
  res.locals.meta = pageMeta({ noindex: true, title: 'Админ-панель' });
  next();
});

const { isAllowedImage, resolveImageExt } = require('../utils/upload');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = resolveImageExt(file);
    cb(null, 'coat-' + Date.now() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedImage(file)) return cb(null, true);
    cb(new Error('Допустимые форматы: JPG, JPEG, PNG, WEBP'));
  }
});

const uploadProgress = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = resolveImageExt(file);
      cb(null, 'progress-' + Date.now() + ext);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedImage(file)) return cb(null, true);
    cb(new Error('Допустимые форматы: JPG, JPEG, PNG, WEBP'));
  }
});

function uploadGalleryImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        err.message = 'Файл слишком большой (максимум 50 МБ). Сожмите фото или выберите другой файл.';
      } else if (err.message === 'File too large') {
        err.message = 'Файл слишком большой (максимум 50 МБ). Сожмите фото или выберите другой файл.';
      }
      return next(err);
    }
    next();
  });
}

const adminNav = [
  { href: '/admin', label: 'Обзор' },
  { href: '/admin/gallery', label: 'Галерея' },
  { href: '/admin/orders', label: 'Заказы' },
  { href: '/admin/rentals', label: 'Аренда' },
  { href: '/admin/users', label: 'Клиенты' },
  { href: '/admin/settings', label: 'Настройки' }
];

function listGallery() {
  return db.prepare('SELECT * FROM gallery ORDER BY sort_order ASC, id ASC').all();
}

router.get('/', (req, res) => {
  expireOldBonuses();
  const gallery = listGallery();
  const orders = db.prepare('SELECT o.*, u.login FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 20').all();
  const users = db.prepare('SELECT id, login, full_name, created_at FROM users ORDER BY created_at DESC LIMIT 10').all();
  const bonusStats = getBonusStats();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const stats = {
    gallery: db.prepare('SELECT COUNT(*) as c FROM gallery').get().c,
    orders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
    users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    rentals: db.prepare('SELECT COUNT(*) as c FROM rental_bookings').get().c,
    ordersMonth: db.prepare(`SELECT COUNT(*) as c FROM orders WHERE date(created_at) >= date(?)`).get(monthIso).c,
    revenueMonth: db.prepare(`SELECT COALESCE(SUM(amount), 0) as s FROM orders WHERE date(created_at) >= date(?) AND status != 'cancelled'`).get(monthIso).s,
    pendingRequests: db.prepare(`
      SELECT COUNT(*) as c FROM orders
      WHERE media_request_status = 'pending' OR change_request_status = 'pending'
    `).get().c
  };

  const popular = db.prepare(`
    SELECT product_title, COUNT(*) as cnt, SUM(amount) as total
    FROM orders WHERE status != 'cancelled'
    GROUP BY product_title ORDER BY cnt DESC LIMIT 5
  `).all();

  res.render('admin/dashboard', {
    title: 'Админ-панель', gallery, orders, users, stats, bonusStats, popular, adminNav,
    settings: getSettings(), message: req.query.msg || null
  });
});

router.get('/gallery', (req, res) => {
  const gallery = listGallery();
  res.render('admin/gallery', {
    title: 'Галерея',
    gallery,
    adminNav,
    error: req.query.error ? decodeURIComponent(req.query.error) : null,
    message: req.query.msg || null,
    name: req.query.name ? decodeURIComponent(req.query.name) : null
  });
});

router.post('/gallery', uploadGalleryImage, (req, res, next) => {
  try {
    const { title, description, price, rent_price_day, rent_price_week, category } = req.body;
    const forOrder = req.body.for_order === 'on' ? 1 : 0;
    const forRent = req.body.for_rent === 'on' ? 1 : 0;
    if (!title?.trim()) {
      return res.render('admin/gallery', {
        title: 'Галерея', gallery: listGallery(), adminNav,
        error: 'Укажите название', message: null
      });
    }
    if (!req.file) {
      return res.render('admin/gallery', {
        title: 'Галерея', gallery: listGallery(), adminNav,
        error: 'Выберите фото (JPG, PNG)', message: null
      });
    }
    if (!forOrder && !forRent) {
      return res.render('admin/gallery', {
        title: 'Галерея', gallery: listGallery(), adminNav,
        error: 'Отметьте «Заказ» или «Аренда»', message: null
      });
    }

    const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM gallery').get().m;
    const imagePath = '/uploads/' + req.file.filename.replace(/\\/g, '/');
    const cat = category === 'children_evening' ? 'children_evening' : 'collection';
    db.prepare(`
      INSERT INTO gallery (title, description, price, image_path, active, sort_order, for_order, for_rent, rent_price_day, rent_price_week, category)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      description?.trim() || '',
      parseFloat(price) || 0,
      imagePath,
      maxSort + 1,
      forOrder,
      forRent,
      parseFloat(rent_price_day) || 0,
      parseFloat(rent_price_week) || 0,
      cat
    );

    res.redirect('/admin/gallery?msg=added');
  } catch (err) {
    next(err);
  }
});

router.post('/gallery/:id/delete', (req, res) => {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!item) {
    return res.redirect('/admin/gallery?error=' + encodeURIComponent('Фото не найдено'));
  }

  const relativePath = (item.image_path || '').replace(/^\//, '').replace(/^uploads\//, 'uploads/');
  const filePath = path.join(__dirname, '..', 'public', relativePath);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.error('Не удалось удалить файл:', filePath, e.message);
  }

  db.prepare('DELETE FROM gallery WHERE id = ?').run(item.id);
  res.redirect('/admin/gallery?msg=deleted&name=' + encodeURIComponent(item.title));
});

router.post('/gallery/:id/toggle', (req, res) => {
  db.prepare('UPDATE gallery SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(req.params.id);
  res.redirect('/admin/gallery');
});

router.post('/gallery/:id/move/:dir', (req, res) => {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!item) return res.redirect('/admin/gallery');

  const neighbor = db.prepare(`
    SELECT * FROM gallery WHERE sort_order ${req.params.dir === 'up' ? '<' : '>'} ?
    ORDER BY sort_order ${req.params.dir === 'up' ? 'DESC' : 'ASC'} LIMIT 1
  `).get(item.sort_order);

  if (neighbor) {
    db.prepare('UPDATE gallery SET sort_order = ? WHERE id = ?').run(neighbor.sort_order, item.id);
    db.prepare('UPDATE gallery SET sort_order = ? WHERE id = ?').run(item.sort_order, neighbor.id);
  }
  res.redirect('/admin/gallery');
});

router.post('/gallery/:id/update', (req, res) => {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(req.params.id);
  if (!item) return res.redirect('/admin/gallery');

  const forOrder = req.body.for_order === 'on' ? 1 : 0;
  const forRent = req.body.for_rent === 'on' ? 1 : 0;
  if (!forOrder && !forRent) return res.redirect('/admin/gallery?error=' + encodeURIComponent('Нужен заказ или аренда'));

  db.prepare(`
    UPDATE gallery SET title = ?, description = ?, price = ?, for_order = ?, for_rent = ?,
    rent_price_day = ?, rent_price_week = ? WHERE id = ?
  `).run(
    req.body.title?.trim() || item.title,
    req.body.description?.trim() || '',
    parseFloat(req.body.price) || 0,
    forOrder,
    forRent,
    parseFloat(req.body.rent_price_day) || 0,
    parseFloat(req.body.rent_price_week) || 0,
    item.id
  );
  res.redirect('/admin/gallery?msg=updated');
});

router.get('/settings', (req, res) => {
  res.render('admin/settings', { title: 'Настройки', settings: getSettings(), adminNav, message: req.query.msg || null });
});

router.post('/settings', (req, res) => {
  const keys = [
    'phone', 'telegram', 'whatsapp', 'vk', 'instagram', 'max',
    'hero_title', 'hero_subtitle', 'hero_bg_image', 'about_image',
    'about_title', 'about_text', 'about_text_2',
    'rental_title', 'rental_text', 'rental_how_title', 'rental_how_text',
    'self_employed_name', 'self_employed_inn', 'self_employed_email',
    'landlord_address', 'landlord_passport', 'landlord_ogrnip',
    'admin_notify_email'
  ];
  for (const key of keys) {
    if (req.body[key] !== undefined) setSetting(key, req.body[key].trim());
  }
  res.redirect('/admin/settings?msg=saved');
});

router.get('/users', (req, res) => {
  expireOldBonuses();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const users = db.prepare(`
    SELECT u.id, u.login, u.email, u.phone, u.full_name, u.created_at,
      COALESCE((
        SELECT SUM(lb.remaining) FROM loyalty_bonuses lb
        WHERE lb.user_id = u.id AND lb.remaining > 0 AND lb.expires_at > ?
      ), 0) as bonus_balance,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status NOT IN ('done','cancelled')) as active_orders
    FROM users u ORDER BY u.created_at DESC
  `).all(now);
  const bonusStats = getBonusStats();

  res.render('admin/users', { title: 'Клиенты', users, bonusStats, adminNav, message: req.query.msg || null });
});

router.get('/users/:id', (req, res) => {
  expireOldBonuses();
  const user = db.prepare('SELECT id, login, email, phone, full_name, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).render('error', { title: '404', message: 'Клиент не найден', user: res.locals.user });

  const bonusBalance = getActiveBonusBalance(user.id);
  const bonusHistory = getBonusHistory(user.id);
  const bonusAdjustments = getBonusAdjustments(user.id);
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
  const measurements = db.prepare('SELECT * FROM user_measurements WHERE user_id = ?').get(user.id);

  res.render('admin/user-detail', {
    title: 'Клиент — ' + user.login,
    user, bonusBalance, bonusHistory, bonusAdjustments, orders, measurements,
    adminNav, message: req.query.msg || null, error: req.query.error || null
  });
});

router.post('/users/:id/update', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.redirect('/admin/users');

  const { login, full_name, email, phone } = req.body;
  if (login?.trim() && login.trim() !== user.login) {
    const taken = db.prepare('SELECT id FROM users WHERE login = ? AND id != ?').get(login.trim(), user.id);
    if (taken) return res.redirect(`/admin/users/${user.id}?error=login`);
    db.prepare('UPDATE users SET login = ? WHERE id = ?').run(login.trim(), user.id);
  }
  db.prepare('UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?').run(
    full_name?.trim() || null, email?.trim() || null, phone?.trim() || null, user.id
  );
  res.redirect(`/admin/users/${user.id}?msg=saved`);
});

router.post('/users/:id/bonus', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { action, amount, note, set_balance } = req.body;
  expireOldBonuses();

  if (action === 'add') {
    adminAddBonus(userId, parseFloat(amount) || 0, note);
  } else if (action === 'deduct') {
    adminDeductBonus(userId, parseFloat(amount) || 0, note);
  } else if (action === 'reset') {
    adminResetBonuses(userId, note);
  } else if (action === 'set') {
    adminSetBonusBalance(userId, parseFloat(set_balance) || 0, note);
  }

  res.redirect(`/admin/users/${userId}?msg=bonus`);
});

router.get('/orders', (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, u.login FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `).all();
  res.render('admin/orders', { title: 'Заказы', orders, adminNav, message: req.query.msg || null });
});

router.get('/orders/:id', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, u.login, u.full_name as user_full_name FROM orders o
    LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).render('error', { title: '404', message: 'Заказ не найден', user: res.locals.user });

  const progressPhotos = db.prepare(
    'SELECT * FROM order_progress_photos WHERE order_id = ? ORDER BY created_at ASC'
  ).all(order.id);

  res.render('admin/order-detail', {
    title: 'Заказ №' + order.id, order, progressPhotos, adminNav, message: req.query.msg || null
  });
});

router.post('/orders/:id/update', (req, res) => {
  const {
    status, estimated_date, stage_note,
    media_request_status, change_request_status
  } = req.body;

  const updates = [];
  const params = [];

  if (status) { updates.push('status = ?'); params.push(status); }
  if (estimated_date !== undefined) { updates.push('estimated_date = ?'); params.push(estimated_date || null); }
  if (stage_note !== undefined) { updates.push('stage_note = ?'); params.push(stage_note || null); }
  if (media_request_status !== undefined) { updates.push('media_request_status = ?'); params.push(media_request_status || ''); }
  if (change_request_status !== undefined) { updates.push('change_request_status = ?'); params.push(change_request_status || ''); }

  if (status === 'cancelled') {
    updates.push("cancelled_by = 'admin'");
    updates.push("cancelled_at = datetime('now','localtime')");
  }

  if (updates.length) {
    params.push(req.params.id);
    db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  res.redirect(`/admin/orders/${req.params.id}?msg=updated`);
});

router.post('/orders/:id/status', (req, res) => {
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.redirect('/admin/orders?msg=updated');
});

router.post('/orders/:id/photos', uploadProgress.single('photo'), (req, res) => {
  const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(req.params.id);
  if (!order || !req.file) return res.redirect(`/admin/orders/${req.params.id}?msg=photo_error`);

  const imagePath = '/uploads/' + req.file.filename.replace(/\\/g, '/');
  db.prepare(`
    INSERT INTO order_progress_photos (order_id, image_path, caption) VALUES (?, ?, ?)
  `).run(order.id, imagePath, req.body.caption?.trim() || null);

  res.redirect(`/admin/orders/${req.params.id}?msg=photo_added`);
});

router.post('/orders/:id/photos/:photoId/delete', (req, res) => {
  const photo = db.prepare('SELECT * FROM order_progress_photos WHERE id = ? AND order_id = ?').get(req.params.photoId, req.params.id);
  if (photo) {
    const relativePath = (photo.image_path || '').replace(/^\//, '');
    const filePath = path.join(__dirname, '..', 'public', relativePath);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    db.prepare('DELETE FROM order_progress_photos WHERE id = ?').run(photo.id);
  }
  res.redirect(`/admin/orders/${req.params.id}?msg=photo_deleted`);
});

router.get('/rentals', (req, res) => {
  const rentals = db.prepare(`
    SELECT r.*, u.login FROM rental_bookings r
    LEFT JOIN users u ON r.user_id = u.id
    ORDER BY r.created_at DESC
  `).all();
  res.render('admin/rentals', {
    title: 'Аренда',
    rentals,
    adminNav,
    message: req.query.msg || null
  });
});

router.post('/rentals/:id/status', (req, res) => {
  db.prepare('UPDATE rental_bookings SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.redirect('/admin/rentals?msg=updated');
});

router.use((err, req, res, next) => {
  if (req.method === 'POST' && req.path === '/gallery') {
    return res.status(400).render('admin/gallery', {
      title: 'Галерея',
      gallery: listGallery(),
      adminNav,
      error: err.message || 'Не удалось загрузить фото',
      message: null
    });
  }
  next(err);
});

module.exports = router;
