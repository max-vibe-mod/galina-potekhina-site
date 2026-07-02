const SEO_CITY = 'Владивосток';
const SEO_REGION = 'Приморский край';
const SEO_BRAND = 'Galina Potekhina';
const SEO_BRAND_RU = 'Студия пошива Галины Потехиной';

const KEYWORD_CLUSTERS = {
  tailoring: [
    'заказать платье владивосток',
    'заказать пошив платья владивосток',
    'пошив платья на заказ владивосток',
    'пошив платьев владивосток',
    'пошив свадебного платья владивосток',
    'пошив вечернего платья владивосток',
    'сшить платье на заказ владивосток',
    'индивидуальный пошив платья владивосток',
    'ателье владивосток',
    'свадебное ателье владивосток',
    'студия пошива владивосток',
    'студия пошива свадебных платьев владивосток',
    'студия пошива вечерних платьев владивосток'
  ],
  buy: [
    'купить платье владивосток',
    'купить вечернее платье владивосток',
    'купить свадебное платье владивосток',
    'вечернее платье владивосток купить',
    'платье на выпускной владивосток купить'
  ],
  rent: [
    'аренда платья владивосток',
    'взять платье в аренду владивосток',
    'аренда вечернего платья владивосток',
    'аренда свадебного платья владивосток',
    'прокат платьев владивосток',
    'платье на выпускной владивосток аренда',
    'аренда платья на торжество владивосток'
  ],
  brand: [
    'galina potekhina',
    'галина потехина студия пошива',
    'студия galina potekhina владивосток'
  ]
};

const DEFAULT_KEYWORDS = [
  ...KEYWORD_CLUSTERS.tailoring,
  ...KEYWORD_CLUSTERS.buy,
  ...KEYWORD_CLUSTERS.rent,
  ...KEYWORD_CLUSTERS.brand
].join(', ');

const DEFAULT_DESCRIPTION =
  'Студия Galina Potekhina во Владивостоке: заказать пошив свадебного или вечернего платья на заказ, купить готовую модель из коллекции или взять платье в аренду на выпускной, свадьбу и торжество. Примерка, консультация, премиальные ткани.';

const SEO_FAQ = [
  {
    q: 'Где во Владивостоке заказать пошив платья на заказ?',
    a: 'В студии Galina Potekhina — мы шьём свадебные и вечерние платья по индивидуальным меркам. Запишитесь на консультацию по телефону или через форму на сайте: обсудим модель, сроки и стоимость.'
  },
  {
    q: 'Можно ли заказать свадебное платье во Владивостоке?',
    a: 'Да. Мы создаём свадебные платья на заказ: подбираем фасон, ткань и декор, проводим примерки и доводим посадку до идеала. Срок пошива — обычно от 2 до 4 недель.'
  },
  {
    q: 'Сколько стоит пошив вечернего платья на заказ?',
    a: 'Стоимость зависит от модели, ткани и сложности отделки. Точную цену рассчитываем после консультации. Позвоните в студию — расскажем о вариантах и запишем на примерку.'
  },
  {
    q: 'Можно ли купить готовое платье во Владивостоке?',
    a: 'Да, в коллекции студии есть готовые авторские модели — вечерние и торжественные платья. Выберите понравившееся в каталоге на сайте и оформите покупку или позвоните для консультации.'
  },
  {
    q: 'Есть ли аренда платьев во Владивостоке?',
    a: 'Да. В студии Galina Potekhina можно взять платье в аренду на выпускной, свадьбу, фотосессию или другое торжество. Тариф — за сутки или неделю, залог при выдаче.'
  },
  {
    q: 'Как взять платье в аренду на выпускной или праздник?',
    a: 'Выберите модель в разделе «Аренда», укажите даты и оформите заявку на сайте. Мы рассчитаем стоимость, подготовим договор и согласуем выдачу в студии.'
  },
  {
    q: 'Сколько стоит аренда платья?',
    a: 'Цена аренды указана у каждой модели в каталоге — от нескольких тысяч рублей за сутки. При оформлении на сайте стоимость рассчитывается автоматически по выбранным датам.'
  },
  {
    q: 'Какие сроки пошива платья на заказ?',
    a: 'В среднем от 2 до 4 недель — в зависимости от сложности модели и загруженности ателье. Точный срок озвучим на консультации после обсуждения вашего заказа.'
  },
  {
    q: 'Как записаться на консультацию и примерку?',
    a: 'Позвоните по телефону на сайте, напишите в мессенджер или оставьте заявку в разделе «Контакты». Можно прийти с референсами и идеями — поможем с выбором.'
  },
  {
    q: 'Работаете ли вы только во Владивостоке?',
    a: 'Студия находится во Владивостоке, Приморский край. Основной формат — личные консультации, примерки и выдача заказов в студии. По индивидуальным заказам возможны варианты доставки — уточняйте по телефону.'
  },
  {
    q: 'Чем студия Galina Potekhina отличается от обычного ателье?',
    a: 'Мы специализируемся на свадебных и вечерних платьях премиального сегмента: индивидуальный пошив, авторская коллекция, аренда эксклюзивных моделей и полное сопровождение заказа от эскиза до финальной примерки.'
  },
  {
    q: 'Можно ли заказать платье по фото или референсу?',
    a: 'Да. Приносите фото, эскизы или описание желаемого образа — адаптируем модель под вашу фигуру, подберём ткани и рассчитаем стоимость пошива на заказ.'
  }
];

const SEO_SERVICES = [
  {
    id: 'tailoring',
    name: 'Пошив платья на заказ',
    description: 'Индивидуальный пошив свадебных и вечерних платьев по меркам во Владивостоке',
    anchor: '#tailoring'
  },
  {
    id: 'buy',
    name: 'Покупка платья',
    description: 'Готовые авторские модели из коллекции студии — купить вечернее или торжественное платье',
    anchor: '#collection-buy'
  },
  {
    id: 'rent',
    name: 'Аренда платья',
    description: 'Аренда вечерних и торжественных платьев на выпускной, свадьбу и мероприятия',
    anchor: '#collection-rent'
  }
];

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
    image: overrides.image || '/logo.png?v=11',
    path: overrides.path || '/',
    noindex: !!overrides.noindex
  };
}

function homeMeta() {
  return pageMeta({
    title: 'Заказать платье, пошив на заказ и аренда — Владивосток',
    description:
      'Galina Potekhina — студия пошива во Владивостоке. Заказать пошив свадебного или вечернего платья, купить готовую модель или взять платье в аренду на торжество. Примерка и консультация.',
    keywords: DEFAULT_KEYWORDS,
    path: '/'
  });
}

function orderMeta(item) {
  const price = item.price > 0 ? ` от ${item.price.toLocaleString('ru-RU')} ₽` : '';
  return pageMeta({
    title: `Заказать «${item.title}» — пошив платья, ${SEO_CITY}`,
    description: `Заказать платье «${item.title}» в студии Galina Potekhina, ${SEO_CITY}.${price} Индивидуальный пошив, примерка, премиальные материалы.`,
    keywords: [
      `заказать платье ${SEO_CITY.toLowerCase()}`,
      `пошив платья на заказ ${SEO_CITY.toLowerCase()}`,
      item.title,
      'galina potekhina'
    ].join(', '),
    path: `/order/${item.id}`,
    image: item.image_path || '/logo.png?v=11'
  });
}

function rentMeta(item) {
  const price = item.rent_price_day > 0
    ? ` от ${item.rent_price_day.toLocaleString('ru-RU')} ₽/сутки`
    : '';
  return pageMeta({
    title: `Аренда «${item.title}» — взять платье в аренду, ${SEO_CITY}`,
    description: `Аренда платья «${item.title}» во Владивостоке — студия Galina Potekhina.${price} Для выпускного, свадьбы, фотосессии и торжеств.`,
    keywords: [
      `аренда платья ${SEO_CITY.toLowerCase()}`,
      `взять платье в аренду ${SEO_CITY.toLowerCase()}`,
      `аренда вечернего платья ${SEO_CITY.toLowerCase()}`,
      item.title
    ].join(', '),
    path: `/rent/${item.id}`,
    image: item.image_path || '/logo.png?v=11'
  });
}

function buyMeta(item) {
  const price = item.price > 0 ? ` ${item.price.toLocaleString('ru-RU')} ₽` : '';
  return pageMeta({
    title: `Купить «${item.title}» — вечернее платье, ${SEO_CITY}`,
    description: `Купить платье «${item.title}» во Владивостоке — студия Galina Potekhina.${price} Позвоните для консультации и оформления.`,
    keywords: [
      `купить платье ${SEO_CITY.toLowerCase()}`,
      `купить вечернее платье ${SEO_CITY.toLowerCase()}`,
      item.title
    ].join(', '),
    path: '/',
    image: item.image_path || '/logo.png?v=11'
  });
}

function formatPhoneE164(phone) {
  if (!phone) return undefined;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return undefined;
  return digits.startsWith('7') ? `+${digits}` : `+7${digits.replace(/^8/, '')}`;
}

function buildLocalBusiness(settings, siteUrl, socialLinks) {
  const sameAs = [socialLinks.instagram, socialLinks.telegram, socialLinks.whatsapp, socialLinks.max, socialLinks.vk]
    .filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': ['ProfessionalService', 'LocalBusiness'],
    '@id': `${siteUrl}/#business`,
    name: SEO_BRAND,
    alternateName: [SEO_BRAND_RU, 'Студия пошива Galina Potekhina'],
    description: DEFAULT_DESCRIPTION,
    url: siteUrl,
    image: `${siteUrl}/logo.png`,
    logo: `${siteUrl}/logo.png`,
    telephone: formatPhoneE164(settings.phone),
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
      'заказать платье на заказ',
      'купить вечернее платье',
      'аренда платьев',
      'аренда свадебных платьев',
      'индивидуальный пошив',
      'студия пошива свадебных и вечерних платьев',
      'ателье владивосток'
    ],
    sameAs: sameAs.length ? sameAs : undefined
  };
}

function buildWebSite(siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: SEO_BRAND,
    alternateName: SEO_BRAND_RU,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'ru-RU',
    publisher: { '@id': `${siteUrl}/#business` }
  };
}

function buildFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': '#faq',
    mainEntity: SEO_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
    }))
  };
}

function buildServicesJsonLd(siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Услуги студии Galina Potekhina',
    itemListElement: SEO_SERVICES.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        '@id': `${siteUrl}/${service.anchor}`,
        name: service.name,
        description: service.description,
        provider: { '@id': `${siteUrl}/#business` },
        areaServed: SEO_CITY,
        url: `${siteUrl}/${service.anchor}`
      }
    }))
  };
}

function buildGalleryJsonLd(gallery, siteUrl) {
  if (!gallery?.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Коллекция платьев студии Galina Potekhina',
    itemListElement: gallery.slice(0, 24).map((item, index) => {
      const itemUrl = item.for_rent
        ? `${siteUrl}/rent/${item.id}`
        : item.for_order
          ? `${siteUrl}/order/${item.id}`
          : `${siteUrl}/#collection`;
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: item.title,
          description: item.description || `Платье «${item.title}» — студия Galina Potekhina, ${SEO_CITY}`,
          image: item.image_path?.startsWith('http') ? item.image_path : `${siteUrl}${item.image_path}`,
          url: itemUrl,
          brand: { '@type': 'Brand', name: SEO_BRAND },
          offers: buildProductOffers(item, siteUrl)
        }
      };
    })
  };
}

function buildProductOffers(item, siteUrl) {
  const offers = [];
  if (item.price > 0 && item.for_order) {
    offers.push({
      '@type': 'Offer',
      price: item.price,
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      url: `${siteUrl}/order/${item.id}`,
      description: 'Покупка платья'
    });
  }
  if (item.rent_price_day > 0 && item.for_rent) {
    offers.push({
      '@type': 'Offer',
      price: item.rent_price_day,
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      url: `${siteUrl}/rent/${item.id}`,
      description: 'Аренда платья за сутки'
    });
  }
  if (!offers.length) return undefined;
  return offers.length === 1 ? offers[0] : offers;
}

function buildBreadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

function buildJsonLd(settings, siteUrl, socialLinks) {
  return [
    buildLocalBusiness(settings, siteUrl, socialLinks),
    buildWebSite(siteUrl)
  ];
}

function buildHomeJsonLd(settings, siteUrl, socialLinks, gallery = []) {
  const blocks = [
    buildLocalBusiness(settings, siteUrl, socialLinks),
    buildWebSite(siteUrl),
    buildFaqJsonLd(),
    buildServicesJsonLd(siteUrl)
  ];
  const galleryBlock = buildGalleryJsonLd(gallery, siteUrl);
  if (galleryBlock) blocks.push(galleryBlock);
  return blocks;
}

function buildOrderJsonLd(item, siteUrl) {
  return [
    buildBreadcrumbJsonLd([
      { name: 'Главная', url: siteUrl },
      { name: 'Коллекция', url: `${siteUrl}/#collection` },
      { name: `Заказать «${item.title}»`, url: `${siteUrl}/order/${item.id}` }
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: item.title,
      description: item.description || `Пошив платья «${item.title}» на заказ в ${SEO_CITY}`,
      image: item.image_path?.startsWith('http') ? item.image_path : `${siteUrl}${item.image_path}`,
      brand: { '@type': 'Brand', name: SEO_BRAND },
      offers: buildProductOffers(item, siteUrl)
    }
  ];
}

function buildRentJsonLd(item, siteUrl) {
  return [
    buildBreadcrumbJsonLd([
      { name: 'Главная', url: siteUrl },
      { name: 'Аренда', url: `${siteUrl}/#collection-rent` },
      { name: `Аренда «${item.title}»`, url: `${siteUrl}/rent/${item.id}` }
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: item.title,
      description: item.description || `Аренда платья «${item.title}» в ${SEO_CITY}`,
      image: item.image_path?.startsWith('http') ? item.image_path : `${siteUrl}${item.image_path}`,
      brand: { '@type': 'Brand', name: SEO_BRAND },
      offers: buildProductOffers(item, siteUrl)
    }
  ];
}

module.exports = {
  SEO_CITY,
  SEO_REGION,
  SEO_BRAND,
  SEO_BRAND_RU,
  KEYWORD_CLUSTERS,
  SEO_FAQ,
  SEO_SERVICES,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  getSiteUrl,
  pageMeta,
  homeMeta,
  orderMeta,
  rentMeta,
  buyMeta,
  buildJsonLd,
  buildHomeJsonLd,
  buildOrderJsonLd,
  buildRentJsonLd
};
