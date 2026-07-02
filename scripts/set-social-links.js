const { ready } = require('../db/database');
const { setSetting, getSettings } = require('../utils/settings');
const { getSocialLinks } = require('../utils/socialLinks');

const LINKS = {
  whatsapp: 'https://wa.me/qr/ZHY7G4YUTOHYL1',
  telegram: 'https://t.me/GalinaPotekhina',
  instagram: 'https://www.instagram.com/atelier.galina?igsh=MWRwY2wxYW81dHgwdw==',
  max: 'https://max.ru/u/f9LHodD0cOIAJCSDxOPQeQgn0EC0GqS_NHeSCz24PQt1iXAClzG8PwTrIfA'
};

ready().then(() => {
  for (const [key, value] of Object.entries(LINKS)) {
    setSetting(key, value);
  }
  const settings = getSettings();
  const social = getSocialLinks(settings);
  console.log('Saved social links:', social);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
