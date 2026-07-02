const DEPOSIT_PERCENT = 0.15;

function countRentDays(rentFrom, rentTo) {
  const start = new Date(rentFrom);
  const end = new Date(rentTo);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
}

function calcRentAmount(item, rentFrom, rentTo, periodType) {
  const days = countRentDays(rentFrom, rentTo);
  if (!days) return { days: 0, weeks: 0, amount: 0, breakdown: '' };

  const dayPrice = item.rent_price_day || 0;
  const weekPrice = item.rent_price_week || 0;

  let amount = 0;
  let weeks = 0;
  let breakdown = '';

  if (periodType === 'week' && weekPrice > 0) {
    weeks = Math.max(1, Math.ceil(days / 7));
    amount = weeks * weekPrice;
    breakdown = `${weeks} нед. × ${formatMoney(weekPrice)} (${days} календ. дн.)`;
  } else if (dayPrice > 0) {
    amount = days * dayPrice;
    breakdown = `${days} дн. × ${formatMoney(dayPrice)}`;
  } else if (weekPrice > 0) {
    weeks = Math.max(1, Math.ceil(days / 7));
    amount = weeks * weekPrice;
    breakdown = `${weeks} нед. × ${formatMoney(weekPrice)}`;
  }

  return { days, weeks, amount: Math.round(amount), breakdown };
}

function calcDeposit(dressValue) {
  const base = Number(dressValue) || 0;
  return Math.round(base * DEPOSIT_PERCENT);
}

function dressValue(item) {
  return Number(item.price) || 0;
}

function suggestRentPrices(dressPrice) {
  const price = Number(dressPrice) || 0;
  if (price <= 0) return { rent_price_day: 0, rent_price_week: 0 };
  const rent_price_day = Math.max(4000, Math.round(price * 0.06));
  const rent_price_week = Math.round(rent_price_day * 5.5);
  return { rent_price_day, rent_price_week };
}

function formatMoney(n) {
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
}

function amountInWords(amount) {
  return `${Math.round(amount).toLocaleString('ru-RU')} руб.`;
}

module.exports = {
  DEPOSIT_PERCENT,
  countRentDays,
  calcRentAmount,
  calcDeposit,
  dressValue,
  suggestRentPrices,
  formatMoney,
  amountInWords
};
