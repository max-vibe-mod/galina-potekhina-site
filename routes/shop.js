const express = require('express');
const fs = require('fs');
const db = require('../db/database');
const { orderMeta, rentMeta } = require('../utils/seo');
const { getSettings } = require('../utils/settings');
const {
  getActiveBonusBalance,
  calculateEarnedBonus,
  applyBonusUsage,
  grantBonus,
  expireOldBonuses
} = require('../utils/loyalty');
const { sendReceipt } = require('../utils/email');
const { notifyNewOrder, notifyNewRental } = require('../utils/notify');

const router = express.Router();

function resolveInsertId(lastInsertRowid, table, userId, galleryId) {
  if (lastInsertRowid) {
    const byId = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(lastInsertRowid);
    if (byId) return byId.id;
  }
  if (userId != null && galleryId != null) {
    const col = table === 'orders' ? 'orders' : 'rental_bookings';
    const byUser = db.prepare(
      `SELECT id FROM ${col} WHERE user_id = ? AND gallery_id = ? ORDER BY id DESC LIMIT 1`
    ).get(userId, galleryId);
    if (byUser) return byUser.id;
  }
  const latest = db.prepare(`SELECT id FROM ${table} ORDER BY id DESC LIMIT 1`).get();
  return latest?.id || 0;
}

function getProfilePrefill(session) {
  if (!session.userId || session.isAdmin) return null;
  return db.prepare('SELECT full_name, email, phone FROM users WHERE id = ?').get(session.userId) || null;
}

const {
  calcRentAmount,
  calcDeposit,
  dressValue,
  DEPOSIT_PERCENT,
  formatMoney
} = require('../utils/rentPricing');
const { saveContract, getContractPath } = require('../utils/rentContract');

router.get('/order/success/:orderId', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Заказ не найден',
      user: res.locals.user
    });
  }

  res.render('order-success', {
    title: 'Заказ оформлен',
    order,
    emailSent: !!order.receipt_sent,
    bonusEarned: order.bonus_earned || 0,
    settings: getSettings()
  });
});

router.get('/rent/success/:bookingId', (req, res) => {
  const booking = db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(req.params.bookingId);
  if (!booking) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Заявка не найдена',
      user: res.locals.user
    });
  }

  res.render('rent-success', {
    title: 'Аренда оформлена',
    booking,
    settings: getSettings()
  });
});

router.get('/order/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ? AND active = 1 AND for_order = 1').get(req.params.id);
  if (!item) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Товар не найден',
      user: res.locals.user
    });
  }

  let bonusBalance = 0;
  if (req.session.userId && !req.session.isAdmin) {
    expireOldBonuses();
    bonusBalance = getActiveBonusBalance(req.session.userId);
  }

  const prefill = getProfilePrefill(req.session);

  res.render('order', {
    title: 'Заказ — ' + item.title,
    meta: orderMeta(item),
    item,
    bonusBalance,
    prefill,
    error: null,
    settings: getSettings()
  });
});

router.get('/rent/contract/:bookingId', (req, res) => {
  const booking = db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(req.params.bookingId);
  if (!booking || !booking.contract_file) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Договор не найден',
      user: res.locals.user
    });
  }
  const filePath = getContractPath(booking.id);
  if (!fs.existsSync(filePath)) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Файл договора не найден',
      user: res.locals.user
    });
  }
  res.type('html').send(fs.readFileSync(filePath, 'utf8'));
});

router.get('/rent/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM gallery WHERE id = ? AND active = 1 AND for_rent = 1').get(req.params.id);
  if (!item) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      message: 'Платье для аренды не найдено',
      user: res.locals.user
    });
  }

  const dv = dressValue(item);
  res.render('rent', {
    title: 'Аренда — ' + item.title,
    meta: rentMeta(item),
    item,
    dressValue: dv,
    depositPreview: calcDeposit(dv),
    depositPercent: Math.round(DEPOSIT_PERCENT * 100),
    prefill: getProfilePrefill(req.session),
    form: null,
    error: null,
    settings: getSettings()
  });
});

router.post('/order/:id', async (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM gallery WHERE id = ? AND active = 1 AND for_order = 1').get(req.params.id);
    if (!item) {
      return res.status(404).render('error', {
        title: 'Не найдено',
        message: 'Товар не найден',
        user: res.locals.user
      });
    }

    const { customer_name, phone, email, address, comment, use_bonus, payment_method } = req.body;
    const settings = getSettings();
    const prefill = getProfilePrefill(req.session);

    if (!customer_name?.trim() || !phone?.trim()) {
      let bonusBalance = 0;
      if (req.session.userId && !req.session.isAdmin) {
        bonusBalance = getActiveBonusBalance(req.session.userId);
      }
      return res.render('order', {
        title: 'Заказ — ' + item.title,
        meta: orderMeta(item),
        item,
        bonusBalance,
        prefill,
        error: 'Укажите имя и телефон',
        settings
      });
    }

    let amount = item.price || 0;
    let bonusUsed = 0;
    const userId = req.session.userId && !req.session.isAdmin ? req.session.userId : null;

    if (userId && use_bonus === 'on') {
      expireOldBonuses();
      const balance = getActiveBonusBalance(userId);
      bonusUsed = Math.min(balance, amount);
      if (bonusUsed > 0) {
        applyBonusUsage(userId, bonusUsed);
        amount -= bonusUsed;
      }
    }

    let bonusEarned = 0;
    const orderAmount = item.price || 0;
    if (userId) {
      bonusEarned = calculateEarnedBonus(userId, orderAmount);
    }

    const result = db.prepare(`
      INSERT INTO orders (user_id, gallery_id, product_title, customer_name, phone, email, address, comment, amount, bonus_used, bonus_earned, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      item.id,
      item.title,
      customer_name.trim(),
      phone.trim(),
      email?.trim() || null,
      address?.trim() || null,
      comment?.trim() || null,
      Math.max(0, amount),
      bonusUsed,
      bonusEarned,
      payment_method || 'card'
    );

    const orderId = resolveInsertId(result.lastInsertRowid, 'orders', userId, item.id);
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    if (!order) {
      return res.status(500).render('error', {
        title: 'Ошибка',
        message: 'Заказ не удалось сохранить. Попробуйте ещё раз.',
        user: res.locals.user
      });
    }

    if (userId && bonusEarned > 0) {
      grantBonus(userId, bonusEarned, orderId);
    }

    const emailResult = await sendReceipt(order, settings);
    if (emailResult.sent) {
      db.prepare('UPDATE orders SET receipt_sent = 1 WHERE id = ?').run(orderId);
    }

    notifyNewOrder(order, settings).catch(err => console.error('Notify order:', err.message));

    res.redirect(`/order/success/${orderId}`);
  } catch (err) {
    next(err);
  }
});

router.post('/rent/:id', async (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM gallery WHERE id = ? AND active = 1 AND for_rent = 1').get(req.params.id);
    if (!item) {
      return res.status(404).render('error', {
        title: 'Не найдено',
        message: 'Платье для аренды не найдено',
        user: res.locals.user
      });
    }

    const settings = getSettings();
    const prefill = getProfilePrefill(req.session);
    const dv = dressValue(item);
    const renderRent = (error, extra = {}) => res.render('rent', {
      title: 'Аренда — ' + item.title,
      meta: rentMeta(item),
      item,
      dressValue: dv,
      depositPreview: calcDeposit(dv),
      depositPercent: Math.round(DEPOSIT_PERCENT * 100),
      prefill,
      error,
      settings,
      form: req.body,
      ...extra
    });

    const {
      customer_name,
      phone,
      email,
      rent_from,
      rent_to,
      period_type,
      comment,
      passport,
      tenant_address,
      tenant_inn,
      rental_purpose,
      payment_method,
      pickup_time,
      return_time,
      accept_terms,
      accept_deposit
    } = req.body;

    if (!customer_name?.trim() || !phone?.trim() || !rent_from || !rent_to) {
      return renderRent('Укажите ФИО, телефон и период аренды в календаре');
    }
    if (!passport?.trim() || !tenant_address?.trim()) {
      return renderRent('Для договора укажите паспортные данные и адрес проживания');
    }
    if (!rental_purpose?.trim()) {
      return renderRent('Укажите цель аренды (например: выпускной, фотосессия)');
    }
    if (accept_terms !== 'on' || accept_deposit !== 'on') {
      return renderRent('Подтвердите условия аренды и согласие с залогом');
    }

    const calc = calcRentAmount(item, rent_from, rent_to, period_type || 'day');
    if (calc.amount <= 0) {
      return renderRent('Не удалось рассчитать стоимость. Проверьте даты и тариф.');
    }

    const deposit = calcDeposit(dv);
    const userId = req.session.userId && !req.session.isAdmin ? req.session.userId : null;

    const paymentLabels = {
      card: 'Банковская карта',
      transfer: 'Перевод на счёт',
      cash: 'Наличные при получении'
    };

    const commentParts = [];
    if (pickup_time) commentParts.push(`Получение: ${pickup_time}`);
    if (return_time) commentParts.push(`Возврат: ${return_time}`);
    if (comment?.trim()) commentParts.push(comment.trim());
    const fullComment = commentParts.length ? commentParts.join('. ') : null;

    const result = db.prepare(`
      INSERT INTO rental_bookings (
        user_id, gallery_id, item_title, customer_name, phone, email,
        rent_from, rent_to, period_type, amount, comment,
        dress_value, deposit_amount, rent_days, rent_weeks, rent_breakdown,
        passport, tenant_address, tenant_inn, rental_purpose, payment_method, terms_accepted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      userId,
      item.id,
      item.title,
      customer_name.trim(),
      phone.trim(),
      email?.trim() || null,
      rent_from,
      rent_to,
      period_type || 'day',
      calc.amount,
      fullComment,
      dv,
      deposit,
      calc.days,
      calc.weeks,
      calc.breakdown,
      passport.trim(),
      tenant_address.trim(),
      tenant_inn?.trim() || null,
      rental_purpose.trim(),
      paymentLabels[payment_method] || payment_method || 'По согласованию'
    );

    const bookingId = resolveInsertId(result.lastInsertRowid, 'rental_bookings', userId, item.id);
    let booking = db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(bookingId);

    if (!booking) {
      return res.status(500).render('error', {
        title: 'Ошибка',
        message: 'Заявку не удалось сохранить.',
        user: res.locals.user
      });
    }

    const contractFile = saveContract(booking, item, settings);
    db.prepare('UPDATE rental_bookings SET contract_file = ? WHERE id = ?').run(contractFile, bookingId);
    booking = db.prepare('SELECT * FROM rental_bookings WHERE id = ?').get(bookingId);

    notifyNewRental(booking, settings).catch(err => console.error('Notify rental:', err.message));

    res.redirect(`/rent/success/${bookingId}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
