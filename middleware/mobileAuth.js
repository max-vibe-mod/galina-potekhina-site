function requireMobileKey(req, res, next) {
  const expected = process.env.MOBILE_ADMIN_KEY;
  if (!expected) {
    return res.status(503).json({
      error: 'Мобильный ключ не настроен на сервере. Добавьте MOBILE_ADMIN_KEY в Render → Environment.'
    });
  }

  const header = req.get('Authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const key = bearer || (req.get('X-Mobile-Key') || '').trim();

  if (!key || key !== expected) {
    return res.status(401).json({ error: 'Неверный ключ доступа' });
  }

  next();
}

module.exports = { requireMobileKey };
