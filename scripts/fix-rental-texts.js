const { ready } = require('../db/database');
const { getSettings, setSetting } = require('../utils/settings');

const FIX = {
  rental_title: 'Аренда платьев',
  rental_text: 'Арендуйте авторские платья студии для съёмок, мероприятий и особых случаев. Каждое платье — единственное в своём исполнении.',
  rental_how_text: 'Свяжитесь с нами по телефону или в мессенджерах — подберём платье, согласуем сроки и условия аренды.'
};

ready().then(() => {
  const before = getSettings();
  console.log('Before:', {
    rental_title: before.rental_title,
    rental_text: before.rental_text,
    rental_how_text: before.rental_how_text
  });

  for (const [key, value] of Object.entries(FIX)) {
    setSetting(key, value);
  }

  const after = getSettings();
  console.log('After:', {
    rental_title: after.rental_title,
    rental_text: after.rental_text,
    rental_how_text: after.rental_how_text
  });
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
