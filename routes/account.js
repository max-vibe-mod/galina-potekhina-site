const express = require('express');
const db = require('../db/database');
const { getSettings } = require('../utils/settings');
const { requireAuth } = require('../middleware/auth');
const {
  getActiveBonusBalance,
  getBonusHistory,
  expireOldBonuses,
  BONUS_THRESHOLD,
  FIRST_ORDER_BONUS,
  BONUS_PERCENT,
  BONUS_DAYS
} = require('../utils/loyalty');
const { getOrderProgress, isActiveOrder, canClientCancel } = require('../utils/orders');

const router = express.Router();

function enrichOrder(o) {
  const progressPhotos = db.prepare(
    'SELECT * FROM order_progress_photos WHERE order_id = ? ORDER BY created_at ASC'
  ).all(o.id);
  return {
    ...o,
    progressPhotos,
    progressInfo: getOrderProgress(o.status),
    isActive: isActiveOrder(o.status),
    canCancel: canClientCancel(o.status)
  };
}

router.get('/account', requireAuth, (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');

  expireOldBonuses();
  const userId = req.session.userId;
  const user = db.prepare('SELECT id, login, email, phone, full_name, created_at FROM users WHERE id = ?').get(userId);
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const measurements = db.prepare('SELECT * FROM user_measurements WHERE user_id = ?').get(userId);
  const fittings = db.prepare('SELECT * FROM fitting_appointments WHERE user_id = ? ORDER BY appointment_date DESC, appointment_time DESC').all(userId);
  const bookedSlots = db.prepare(`
    SELECT appointment_date, appointment_time FROM fitting_appointments
    WHERE status != 'cancelled' AND appointment_date >= date('now')
  `).all();
  const bonusBalance = getActiveBonusBalance(userId);
  const bonusHistory = getBonusHistory(userId);
  const settings = getSettings();
  const rentals = db.prepare('SELECT * FROM rental_bookings WHERE user_id = ? ORDER BY created_at DESC').all(userId);

  const ordersWithProgress = orders.map(enrichOrder);
  const activeOrders = ordersWithProgress.filter(o => o.isActive);
  const pastOrders = ordersWithProgress.filter(o => !o.isActive);

  res.render('account', {
    title: 'Личный кабинет',
    user,
    orders: ordersWithProgress,
    activeOrders,
    pastOrders,
    measurements,
    fittings,
    bookedSlots,
    bonusBalance,
    bonusHistory,
    rentals,
    bonusRules: { BONUS_THRESHOLD, FIRST_ORDER_BONUS, BONUS_PERCENT, BONUS_DAYS },
    settings,
    saved: req.query.saved || null,
    error: req.query.error || null
  });
});

router.post('/account/profile', requireAuth, (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  const { full_name, email, phone } = req.body;
  db.prepare('UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?').run(
    full_name?.trim() || null,
    email?.trim() || null,
    phone?.trim() || null,
    req.session.userId
  );
  res.redirect('/account?saved=profile#overview');
});

router.post('/account/measurements', requireAuth, (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');

  const userId = req.session.userId;
  const fields = ['chest', 'waist', 'hips', 'sleeve', 'shoulder', 'height', 'neck'];
  const values = fields.map(f => parseFloat(req.body[f]) || null);
  const notes = req.body.notes?.trim() || null;

  const existing = db.prepare('SELECT user_id FROM user_measurements WHERE user_id = ?').get(userId);
  if (existing) {
    db.prepare(`
      UPDATE user_measurements SET chest=?, waist=?, hips=?, sleeve=?, shoulder=?, height=?, neck=?, notes=?,
      updated_at=datetime('now','localtime') WHERE user_id=?
    `).run(...values, notes, userId);
  } else {
    db.prepare(`
      INSERT INTO user_measurements (user_id, chest, waist, hips, sleeve, shoulder, height, neck, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, ...values, notes);
  }

  res.redirect('/account?saved=measurements#measurements');
});

router.post('/account/fitting', requireAuth, (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');

  const { appointment_date, appointment_time, notes } = req.body;
  if (!appointment_date || !appointment_time) {
    return res.redirect('/account?error=fitting#fitting');
  }

  const taken = db.prepare(`
    SELECT id FROM fitting_appointments
    WHERE appointment_date = ? AND appointment_time = ? AND status != 'cancelled'
  `).get(appointment_date, appointment_time);

  if (taken) {
    return res.redirect('/account?error=slot#fitting');
  }

  db.prepare(`
    INSERT INTO fitting_appointments (user_id, appointment_date, appointment_time, notes)
    VALUES (?, ?, ?, ?)
  `).run(req.session.userId, appointment_date, appointment_time, notes?.trim() || null);

  res.redirect('/account?saved=fitting#fitting');
});

router.post('/account/orders/:id/cancel', requireAuth, (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!order || !canClientCancel(order.status)) {
    return res.redirect('/account?error=cancel#orders-active');
  }
  db.prepare(`
    UPDATE orders SET status = 'cancelled', cancelled_by = 'client',
    cancelled_at = datetime('now','localtime') WHERE id = ?
  `).run(order.id);
  res.redirect('/account?saved=cancel#orders-active');
});

router.post('/account/orders/:id/media-request', requireAuth, (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!order || !isActiveOrder(order.status)) {
    return res.redirect('/account?error=order#orders-active');
  }
  const text = req.body.media_request?.trim();
  if (!text) return res.redirect('/account?error=empty#orders-active');
  db.prepare(`
    UPDATE orders SET media_request = ?, media_request_status = 'pending' WHERE id = ?
  `).run(text, order.id);
  res.redirect('/account?saved=media#orders-active');
});

router.post('/account/orders/:id/change-request', requireAuth, (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  if (req.body.confirm_extra !== 'on') {
    return res.redirect('/account?error=confirm#orders-active');
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
  if (!order || !isActiveOrder(order.status)) {
    return res.redirect('/account?error=order#orders-active');
  }
  const text = req.body.change_request?.trim();
  if (!text) return res.redirect('/account?error=empty#orders-active');
  db.prepare(`
    UPDATE orders SET change_request = ?, change_request_status = 'pending' WHERE id = ?
  `).run(text, order.id);
  res.redirect('/account?saved=change#orders-active');
});

module.exports = router;
