const WA_GREETING = 'Здравствуйте! Интересует студия Galina Potekhina.';

function normalizeUrl(value) {
  const v = (value || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(t\.me|wa\.me|instagram\.com|max\.ru|www\.)/i.test(v)) return `https://${v.replace(/^\/\//, '')}`;
  return v;
}

function getWhatsAppHref(settings) {
  const raw = (settings.whatsapp || '').trim();
  if (/^https?:\/\//i.test(raw) || /^wa\.me\//i.test(raw)) {
    return normalizeUrl(raw);
  }
  if (raw.includes('wa.me/')) {
    return normalizeUrl(raw);
  }
  const phone = (raw || settings.phone || '').replace(/[^\d]/g, '');
  if (!phone) return '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(WA_GREETING)}`;
}

function getSocialLinks(settings) {
  const maxDefault = 'https://max.ru/u/f9LHodD0cOIAJCSDxOPQeQgn0EC0GqS_NHeSCz24PQt1iXAClzG8PwTrIfA';
  const maxRaw = (settings.max || '').trim();
  return {
    whatsapp: getWhatsAppHref(settings),
    telegram: normalizeUrl(settings.telegram),
    instagram: normalizeUrl(settings.instagram),
    max: normalizeUrl(maxRaw) || maxDefault
  };
}

module.exports = { getWhatsAppHref, getSocialLinks, normalizeUrl };
