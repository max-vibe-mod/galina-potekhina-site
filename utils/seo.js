const SEO_CITY = 'Владивосток';
const SEO_REGION = 'Приморский край';
const SEO_BRAND = 'Galina Potekhina';

const DEFAULT_KEYWORDS = [
  'пошив платьев владивосток',
  'пошив платья на заказ владивосток',
  'ателье владивосток вечерние платья',
  'свадебное ателье владивосток',
  'студия пошива свадебных платьев владивосток',
  'студия пошива вечерних платьев владивосток',
  'купить вечернее платье владивосток',
  'купить свадебное платье владивосток',
  'аренда платья владивосток',
  'аренда вечернего платья владивосток',
  'аренда свадебного платья владивосток',
  'atelier galina potekhina',
  'студия пошива galina potekhina владивосток'
].join(', ');

const DEFAULT_DESCRIPTION =
  'Студия пошива свадебных и вечерних платьев Galina Potekhina во Владивостоке — индивидуальный пошив на заказ, покупка готовых моделей из коллекции и аренда платьев. Примерка, премиальные ткани, ручная работа.';

function getSiteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
}

function pageMeta(overrides = {}) {
  return {
    title: overrides.title || SEO_BRAND,
    description: overrides.description || DEFAULT_DESCRIPTION,
    keywords: overrides.keywords || DEFAULT_KEYWORDS,
    image: overrides.image || '/logo.png',
    path: overrides.path || '/',
    noindex: !!overrides.noindex
  };
}

function homeMeta() {
  return pageMeta({
    title: 'Студия пошива свадебных и вечерних платьев — Владивосток',
    description:
      'Galina Potekhina — студия пошива во Владивостоке: индивидуальный пошив свадебных и вечерних платьев, покупка моделей из коллекции и аренда на торжество. Примерки и консультация.',
    keywords: [
      'студия пошива владивосток',
      'пошив платьев владивосток',
      'пошив свадебного платья владивосток',
      'свадебное ателье владивосток',
      'аренда платья владивосток',
      'купить вечернее платье владивосток',
      'galina potekhina'
    ].join(', '),
    path: '/'
  });
}

function orderMeta(item) {
  const price = item.price > 0 ? ` от ${item.price.toLocaleString('ru-RU')} ₽` : '';
  return pageMeta({
    title: `Заказать «${item.title}» — пошив во Владивостоке`,
    description: `Платье «${item.title}» на заказ в студии Galina Potekhina, ${SEO_CITY}.${price} Индивидуальный пошив, примерка, премиальные материалы.`,
    path: `/order/${item.id}`,
    image: item.image_path || '/logo.png'
  });
}

function rentMeta(item) {
  const price = item.rent_price_day > 0
    ? ` от ${item.rent_price_day.toLocaleString('ru-RU')} ₽/день`
    : '';
  return pageMeta({
    title: `Аренда «${item.title}» — Владивосток`,
    description: `Аренда платья «${item.title}» во Владивостоке — студия Galina Potekhina.${price} Для свадьбы, фотосессии и торжеств.`,
    keywords: `аренда платья владивосток, аренда вечернего платья, ${item.title}`,
    path: `/rent/${item.id}`,
    image: item.image_path || '/logo.png'
  });
}

function buyMeta(item) {
  const price = item.price > 0 ? ` ${item.price.toLocaleString('ru-RU')} ₽` : '';
  return pageMeta({
    title: `Купить «${item.title}» — Владивосток`,
    description: `Покупка платья «${item.title}» во Владивостоке — студия Galina Potekhina.${price} Позвоните для консультации и оформления.`,
    keywords: `купить вечернее платье владивосток, купить платье, ${item.title}`,
    path: `/`,
    image: item.image_path || '/logo.png'
  });
}

function buildJsonLd(settings, siteUrl, socialLinks) {
  const phone = settings.phone ? settings.phone.replace(/\D/g, '') : '';
  const sameAs = [socialLinks.instagram, socialLinks.telegram, socialLinks.whatsapp, socialLinks.max, socialLinks.vk]
    .filter(Boolean);

  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${siteUrl}/#business`,
    name: SEO_BRAND,
    description: DEFAULT_DESCRIPTION,
    url: siteUrl,
    image: `${siteUrl}/logo.png`,
    logo: `${siteUrl}/logo.png`,
    telephone: phone ? (phone.startsWith('7') ? `+${phone}` : phone) : undefined,
    priceRange: '₽₽₽',
    address: {
      '@type': 'PostalAddress',
      addressLocality: SEO_CITY,
      addressRegion: SEO_REGION,
      addressCountry: 'RU'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 43.115542,
      longitude: 131.885494
    },
    areaServed: {
      '@type': 'City',
      name: SEO_CITY
    },
    knowsAbout: [
      'пошив свадебных платьев',
      'пошив вечерних платьев',
      'покупка вечерних платьев',
      'аренда платьев',
      'аренда свадебных платьев',
      'индивидуальный пошив',
      'студия пошива свадебных и вечерних платьев'
    ],
    sameAs: sameAs.length ? sameAs : undefined
  };

  const webSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: SEO_BRAND,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'ru-RU',
    publisher: { '@id': `${siteUrl}/#business` }
  };

  return [localBusiness, webSite];
}

module.exports = {
  SEO_CITY,
  SEO_REGION,
  SEO_BRAND,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  getSiteUrl,
  pageMeta,
  homeMeta,
  orderMeta,
  rentMeta,
  buyMeta,
  buildJsonLd
};
