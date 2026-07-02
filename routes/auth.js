const express = require('express');

const bcrypt = require('bcryptjs');

const db = require('../db/database');

const { pageMeta } = require('../utils/seo');



const router = express.Router();



router.get('/login', (req, res) => {

  if (req.session.userId) return res.redirect(req.session.isAdmin ? '/admin' : '/account');

  res.render('login', {

    title: 'Вход',

    meta: pageMeta({ title: 'Вход', noindex: true, path: '/login' }),

    next: req.query.next || '/',

    error: req.query.error || null

  });

});



router.get('/register', (req, res) => {

  res.redirect(301, '/');

});



router.post('/login', (req, res) => {

  const { login, password } = req.body;

  const next = req.body.next || '/';



  if (login === process.env.ADMIN_LOGIN && password === process.env.ADMIN_PASSWORD) {

    req.session.userId = 0;

    req.session.login = login;

    req.session.isAdmin = true;

    return res.redirect('/admin');

  }



  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {

    return res.redirect('/login?error=' + encodeURIComponent('Неверный логин или пароль'));

  }



  req.session.userId = user.id;

  req.session.login = user.login;

  req.session.isAdmin = false;

  res.redirect(next.startsWith('/') ? next : '/');

});



router.post('/register', (req, res) => {

  res.redirect(301, '/');

});



router.post('/logout', (req, res) => {

  req.session.destroy(() => res.redirect('/'));

});



module.exports = router;

