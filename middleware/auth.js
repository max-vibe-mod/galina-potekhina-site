function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(403).render('error', {
      title: 'Доступ запрещён',
      message: 'Эта страница доступна только администратору.',
      user: res.locals.user
    });
  }
  next();
}

function attachUser(req, res, next) {
  res.locals.user = req.session.userId
    ? {
        id: req.session.userId,
        login: req.session.login,
        isAdmin: !!req.session.isAdmin
      }
    : null;
  next();
}

module.exports = { requireAuth, requireAdmin, attachUser };
