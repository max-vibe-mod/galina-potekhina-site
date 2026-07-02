const nodemailer = require('nodemailer');

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mail.ru',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function buildReceiptHtml(order, settings) {
  const date = new Date(order.created_at).toLocaleString('ru-RU');
  return `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Чек №${order.id}</title></head>
<body style="font-family: Georgia, serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="text-align: center; border-bottom: 2px solid #c9a86c; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="color: #c9a86c; font-weight: normal; letter-spacing: 2px;">Galina Potekhina</h1>
    <p style="color: #666;">Квитанция об оплате (самозанятый)</p>
  </div>
  <p><strong>Исполнитель:</strong> ${settings.self_employed_name || 'Потёхина Галина'}</p>
  ${settings.self_employed_inn ? `<p><strong>ИНН:</strong> ${settings.self_employed_inn}</p>` : ''}
  <p><strong>Дата:</strong> ${date}</p>
  <p><strong>Чек №:</strong> ${order.id}</p>
  <hr style="border-color: #e8dcc8;">
  <p><strong>Товар/услуга:</strong> ${order.product_title}</p>
  <p><strong>Заказчик:</strong> ${order.customer_name}</p>
  <p><strong>Телефон:</strong> ${order.phone}</p>
  ${order.email ? `<p><strong>Email:</strong> ${order.email}</p>` : ''}
  ${order.address ? `<p><strong>Адрес:</strong> ${order.address}</p>` : ''}
  <p style="font-size: 24px; color: #c9a86c; margin-top: 24px;"><strong>Сумма: ${order.amount.toLocaleString('ru-RU')} ₽</strong></p>
  ${order.bonus_used > 0 ? `<p>Использовано бонусов: ${order.bonus_used} ₽</p>` : ''}
  ${order.bonus_earned > 0 ? `<p>Начислено бонусов: ${order.bonus_earned} ₽</p>` : ''}
  <p style="margin-top: 32px; color: #888; font-size: 12px;">Документ сформирован автоматически. Спасибо за заказ!</p>
</body>
</html>`;
}

async function sendReceipt(order, settings) {
  if (!order) return { sent: false, reason: 'no_order' };
  if (!order.email) return { sent: false, reason: 'no_email' };

  const transporter = createTransporter();
  if (!transporter) return { sent: false, reason: 'smtp_not_configured' };

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: order.email,
      subject: `Чек №${order.id} — Galina Potekhina`,
      html: buildReceiptHtml(order, settings)
    });
    return { sent: true };
  } catch (err) {
    console.error('Email error:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendReceipt, buildReceiptHtml };
