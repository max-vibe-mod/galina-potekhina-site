/** Красивое отображение телефона для РФ (+7 …). */
function formatPhoneDisplay(phone) {
  if (!phone || typeof phone !== 'string') return phone || '';
  const digits = phone.replace(/\D/g, '');
  let n = digits;
  if (n.length === 11 && n[0] === '8') n = '7' + n.slice(1);
  if (n.length === 11 && n[0] === '7') {
    return `+7 ${n.slice(1, 4)} ${n.slice(4, 7)}-${n.slice(7, 9)}-${n.slice(9, 11)}`;
  }
  if (n.length === 10) {
    return `+7 ${n.slice(0, 3)} ${n.slice(3, 6)}-${n.slice(6, 8)}-${n.slice(8, 10)}`;
  }
  return phone.trim();
}

function phoneTelHref(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '8') return `tel:+7${digits.slice(1)}`;
  if (digits.length === 11 && digits[0] === '7') return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+7${digits}`;
  return `tel:${digits}`;
}

module.exports = { formatPhoneDisplay, phoneTelHref };
