function requireMobileKey(req, res, next) {
  const expected = process.env.MOBILE_ADMIN_KEY || 'gp-mobile-8f3c2a91b7e4d605c3f1a9b2e7d4c86';
  const header = req.get('Authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const key = bearer || (req.get('X-Mobile-Key') || '').trim();

  if (!key || key !== expected) {
    return res.status(401).json({ error: 'Неверный ключ доступа' });
  }

  next();
}

module.exports = { requireMobileKey };
