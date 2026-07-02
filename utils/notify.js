const nodemailer = require('nodemailer');

function siteBase() {
  return (process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
}

function mobileAppUrl(hash) {
  return `${siteBase()}/admin/index.html${hash ? `#${hash}` : ''}`;
}

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mail.ru',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendTelegram(text) {
  const token = process.env.ADMIN_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { sent: false, reason: 'telegram_not_configured' };

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('Telegram notify error:', body);
      return { sent: false, reason: 'telegram_failed' };
    }
    return { sent: true };
  } catch (err) {
    console.error('Telegram notify error:', err.message);
    return { sent: false, reason: err.message };
  }
}

async function notifyAdmin(subject, html, plainText, settings) {
  const to = settings.admin_notify_email || process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER;
  const results = { email: { sent: false }, telegram: { sent: false } };

  if (to) {
    const transporter = createTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to,
          subject,
          html,
          text: plainText
        });
        results.email.sent = true;
      } catch (err) {
        console.error('Admin email notify error:', err.message);
        results.email.reason = err.message;
      }
    } else {
      results.email.reason = 'smtp_not_configured';
    }
  }

  results.telegram = await sendTelegram(plainText.replace(/\n/g, '\n'));
  return results;
}

async function notifyNewOrder(order, settings) {
  if (!order) return;
  const base = siteBase();
  const subject = `🛍 Новый заказ №${order.id} — Galina Potekhina`;
  const plain = [
    `🛍 Новый заказ №${order.id}`,
    `Товар: ${order.product_title}`,
    `Клиент: ${order.customer_name}`,
    `Телефон: ${order.phone}`,
    order.email ? `Email: ${order.email}` : null,
    `Сумма: ${order.amount} ₽`,
    '',
    `Мобильное приложение: ${mobileAppUrl('inbox')}`,
    `Админка: ${base}/admin/orders/${order.id}`
  ].filter(Boolean).join('\n');

  const html = `<p><strong>🛍 Новый заказ №${order.id}</strong></p>
    <p>Товар: ${order.product_title}<br>
    Клиент: ${order.customer_name}<br>
    Телефон: <a href="tel:${order.phone}">${order.phone}</a><br>
    ${order.email ? `Email: ${order.email}<br>` : ''}
    Сумма: <strong>${order.amount.toLocaleString('ru-RU')} ₽</strong></p>
    <p><a href="${mobileAppUrl('inbox')}">Открыть в приложении</a> ·
    <a href="${base}/admin/orders/${order.id}">Веб-админка</a></p>`;

  return notifyAdmin(subject, html, plain, settings);
}

async function notifyNewRental(booking, settings) {
  if (!booking) return;
  const base = siteBase();
  const subject = `👗 Новая аренда №${booking.id} — Galina Potekhina`;
  const plain = [
    `👗 Новая заявка на аренду №${booking.id}`,
    `Платье: ${booking.item_title}`,
    `Клиент: ${booking.customer_name}`,
    `Телефон: ${booking.phone}`,
    `Период: ${booking.rent_from} — ${booking.rent_to}`,
    `Сумма: ${booking.amount} ₽`,
  booking.deposit_amount ? `Залог: ${booking.deposit_amount} ₽` : null,
    '',
    `Мобильное приложение: ${mobileAppUrl('inbox')}`,
    `Админка: ${base}/admin/rentals`
  ].filter(Boolean).join('\n');

  const html = `<p><strong>👗 Новая аренда №${booking.id}</strong></p>
    <p>Платье: ${booking.item_title}<br>
    Клиент: ${booking.customer_name}<br>
    Телефон: <a href="tel:${booking.phone}">${booking.phone}</a><br>
    Период: ${booking.rent_from} — ${booking.rent_to}<br>
    Сумма: <strong>${booking.amount.toLocaleString('ru-RU')} ₽</strong></p>
    <p><a href="${mobileAppUrl('inbox')}">Открыть в приложении</a> ·
    <a href="${base}/admin/rentals">Веб-админка</a></p>`;

  return notifyAdmin(subject, html, plain, settings);
}

module.exports = { notifyNewOrder, notifyNewRental, sendTelegram, mobileAppUrl };
