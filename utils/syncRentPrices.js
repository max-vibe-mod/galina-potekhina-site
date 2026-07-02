const db = require('../db/database');
const { suggestRentPrices } = require('./rentPricing');

function syncRentPrices() {
  const items = db.prepare(`
    SELECT id, price FROM gallery WHERE for_rent = 1 AND price > 0
  `).all();

  for (const item of items) {
    const { rent_price_day, rent_price_week } = suggestRentPrices(item.price);
    db.prepare(`
      UPDATE gallery SET rent_price_day = ?, rent_price_week = ? WHERE id = ?
    `).run(rent_price_day, rent_price_week, item.id);
  }
}

module.exports = { syncRentPrices };
