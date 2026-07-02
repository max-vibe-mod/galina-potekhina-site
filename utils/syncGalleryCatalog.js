const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { setSetting } = require('./settings');
const { suggestRentPrices } = require('./rentPricing');

const CATALOG_PATH = path.join(__dirname, '..', 'public', 'data', 'gallery-catalog.json');

function syncGalleryCatalog() {
  if (!fs.existsSync(CATALOG_PATH)) return;

  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  } catch (err) {
    console.warn('[gallery-catalog] Не удалось прочитать JSON:', err.message);
    return;
  }

  if (catalog.settings && typeof catalog.settings === 'object') {
    for (const [key, value] of Object.entries(catalog.settings)) {
      if (value != null && String(value).trim() !== '') {
        setSetting(key, String(value));
      }
    }
  }

  const items = Array.isArray(catalog.items) ? catalog.items : [];
  for (const item of items) {
    if (!item.fileKey || !item.title) continue;

    const ext = item.ext || '.png';
    const imagePath = `/uploads/evening/${item.fileKey}${ext}`;
    const price = Number(item.price) || 0;
    const { rent_price_day, rent_price_week } = suggestRentPrices(price);
    const active = item.active === false ? 0 : 1;
    const row = db.prepare('SELECT id FROM gallery WHERE image_path = ?').get(imagePath);

    if (row) {
      db.prepare(`
        UPDATE gallery
        SET title = ?, description = ?, price = ?, sort_order = ?,
            for_rent = 1, for_order = 1, rent_price_day = ?, rent_price_week = ?,
            category = 'evening_couture', active = ?
        WHERE image_path = ?
      `).run(
        item.title,
        item.description || '',
        price,
        item.sort_order || 0,
        rent_price_day,
        rent_price_week,
        active,
        imagePath
      );
      continue;
    }

    if (!active) continue;

    db.prepare(`
      INSERT INTO gallery (
        title, description, price, image_path, active, sort_order,
        for_order, for_rent, rent_price_day, rent_price_week, category
      ) VALUES (?, ?, ?, ?, 1, ?, 1, 1, ?, ?, 'evening_couture')
    `).run(
      item.title,
      item.description || '',
      price,
      imagePath,
      item.sort_order || 0,
      rent_price_day,
      rent_price_week
    );
  }

  if (items.length) {
    console.log(`[gallery-catalog] Синхронизировано записей: ${items.length}`);
  }
}

module.exports = { syncGalleryCatalog };
