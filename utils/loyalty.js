const db = require('../db/database');

const BONUS_THRESHOLD = 10000;
const FIRST_ORDER_BONUS = 300;
const BONUS_PERCENT = 0.01;
const BONUS_DAYS = 90;

function getActiveBonusBalance(userId) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const row = db.prepare(`
    SELECT COALESCE(SUM(remaining), 0) as total
    FROM loyalty_bonuses
    WHERE user_id = ? AND remaining > 0 AND expires_at > ?
  `).get(userId, now);
  return row?.total || 0;
}

function getBonusHistory(userId) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return db.prepare(`
    SELECT *, CASE WHEN expires_at <= ? THEN 1 ELSE 0 END as expired
    FROM loyalty_bonuses
    WHERE user_id = ?
    ORDER BY earned_at DESC
  `).all(now, userId);
}

function calculateEarnedBonus(userId, orderAmount) {
  if (orderAmount < BONUS_THRESHOLD) return 0;

  let bonus = Math.floor(orderAmount * BONUS_PERCENT);
  const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders WHERE user_id = ? AND status != ?').get(userId, 'cancelled')?.c || 0;

  if (orderCount === 0) {
    bonus += FIRST_ORDER_BONUS;
  }

  return bonus;
}

function applyBonusUsage(userId, amountToUse) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const bonuses = db.prepare(`
    SELECT * FROM loyalty_bonuses
    WHERE user_id = ? AND remaining > 0 AND expires_at > ?
    ORDER BY expires_at ASC
  `).all(userId, now);

  let left = amountToUse;
  const update = db.prepare('UPDATE loyalty_bonuses SET remaining = ? WHERE id = ?');

  for (const b of bonuses) {
    if (left <= 0) break;
    const use = Math.min(b.remaining, left);
    update.run(b.remaining - use, b.id);
    left -= use;
  }

  return amountToUse - left;
}

function grantBonus(userId, amount, orderId) {
  if (amount <= 0) return;

  const expires = new Date();
  expires.setDate(expires.getDate() + BONUS_DAYS);
  const expiresAt = expires.toISOString().slice(0, 19).replace('T', ' ');

  db.prepare(`
    INSERT INTO loyalty_bonuses (user_id, amount, remaining, expires_at, order_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, amount, amount, expiresAt, orderId);
}

function expireOldBonuses() {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  db.prepare('UPDATE loyalty_bonuses SET remaining = 0 WHERE expires_at <= ? AND remaining > 0').run(now);
}

function logBonusAdjustment(userId, amount, action, note) {
  db.prepare('INSERT INTO bonus_adjustments (user_id, amount, action, note) VALUES (?, ?, ?, ?)').run(
    userId, amount, action, note || null
  );
}

function adminAddBonus(userId, amount, note) {
  if (amount <= 0) return;
  grantBonus(userId, amount, null);
  logBonusAdjustment(userId, amount, 'add', note);
}

function adminDeductBonus(userId, amount, note) {
  if (amount <= 0) return;
  applyBonusUsage(userId, amount);
  logBonusAdjustment(userId, -amount, 'deduct', note);
}

function adminResetBonuses(userId, note) {
  const balance = getActiveBonusBalance(userId);
  if (balance <= 0) return;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  db.prepare(`
    UPDATE loyalty_bonuses SET remaining = 0
    WHERE user_id = ? AND remaining > 0 AND expires_at > ?
  `).run(userId, now);
  logBonusAdjustment(userId, -balance, 'reset', note);
}

function adminSetBonusBalance(userId, targetAmount, note) {
  expireOldBonuses();
  adminResetBonuses(userId, 'Сброс перед установкой баланса');
  if (targetAmount > 0) adminAddBonus(userId, targetAmount, note);
}

function getBonusAdjustments(userId) {
  return db.prepare('SELECT * FROM bonus_adjustments WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

function getBonusStats() {
  expireOldBonuses();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return {
    totalActive: db.prepare(`
      SELECT COALESCE(SUM(remaining), 0) as v FROM loyalty_bonuses
      WHERE remaining > 0 AND expires_at > ?
    `).get(now)?.v || 0,
    usersWithBonus: db.prepare(`
      SELECT COUNT(DISTINCT user_id) as v FROM loyalty_bonuses
      WHERE remaining > 0 AND expires_at > ?
    `).get(now)?.v || 0,
    totalIssued: db.prepare('SELECT COALESCE(SUM(amount), 0) as v FROM loyalty_bonuses').get()?.v || 0
  };
}

module.exports = {
  BONUS_THRESHOLD,
  FIRST_ORDER_BONUS,
  BONUS_PERCENT,
  BONUS_DAYS,
  getActiveBonusBalance,
  getBonusHistory,
  getBonusAdjustments,
  getBonusStats,
  calculateEarnedBonus,
  applyBonusUsage,
  grantBonus,
  expireOldBonuses,
  adminAddBonus,
  adminDeductBonus,
  adminResetBonuses,
  adminSetBonusBalance
};
