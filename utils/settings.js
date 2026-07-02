const db = require('../db/database');

const RENTAL_DEFAULTS = {
  rental_title: 'Аренда платьев',
  rental_text: 'Арендуйте авторские платья студии для съёмок, мероприятий и особых случаев. Каждое платье — единственное в своём исполнении.',
  rental_how_text: 'Выберите платье, заполните заявку на сайте — рассчитаем аренду по дням или неделям и сформируем проект договора. Подпись Галины — при выдаче в студии.'
};

function needsRentalFix(key, value) {
  if (!value) return false;
  const v = String(value).toLowerCase();
  if (key === 'rental_title') return v.includes('вещ');
  if (key === 'rental_text') return v.includes('вещ') || v.includes('издел');
  if (key === 'rental_how_text') return v.includes('вещ');
  return false;
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));

  for (const [key, newValue] of Object.entries(RENTAL_DEFAULTS)) {
    if (needsRentalFix(key, settings[key])) {
      setSetting(key, newValue);
      settings[key] = newValue;
    }
  }

  return settings;
}
function setSetting(key, value) {
  db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

module.exports = { getSettings, setSetting };
