(function () {
  'use strict';

  const form = document.getElementById('rent-form');
  if (!form) return;

  const priceDay = Number(form.dataset.priceDay) || 0;
  const priceWeek = Number(form.dataset.priceWeek) || 0;
  const dressValue = Number(form.dataset.dressValue) || 0;
  const depositPercent = Number(form.dataset.depositPercent) || 15;

  const fromEl = document.getElementById('rent_from');
  const toEl = document.getElementById('rent_to');
  const periodEl = document.getElementById('period_type');
  const daysEl = document.getElementById('rent-calc-days');
  const rentEl = document.getElementById('rent-calc-rent');
  const depositEl = document.getElementById('rent-calc-deposit');
  const totalEl = document.getElementById('rent-calc-total');

  const fmt = window.rentCalendarFormat || null;

  function money(n) {
    return Math.round(n).toLocaleString('ru-RU') + ' ₽';
  }

  function countDays(from, to) {
    if (fmt && fmt.countDays) return fmt.countDays(from, to);
    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
    return Math.max(1, Math.ceil((end - start) / 86400000) + 1);
  }

  function periodLabel(from, to, days) {
    if (fmt && fmt.fmtLong) {
      const dl = fmt.daysLabel ? fmt.daysLabel(days) : 'календ. дн.';
      return `${fmt.fmtLong(from)} — ${fmt.fmtLong(to)} (${days} ${dl})`;
    }
    return `${from} — ${to} (${days} календ. дн.)`;
  }

  function calc() {
    const from = fromEl.value;
    const to = toEl.value;
    const period = periodEl.value;
    const days = countDays(from, to);
    const deposit = Math.round(dressValue * (depositPercent / 100));

    if (!days) {
      daysEl.textContent = 'Выберите период в календаре выше';
      rentEl.textContent = 'Аренда: —';
      totalEl.textContent = 'Итого при выдаче: —';
      depositEl.textContent = `Залог: ${money(deposit)}`;
      return;
    }

    let rent = 0;
    let breakdown = '';

    if (period === 'week' && priceWeek > 0) {
      const weeks = Math.max(1, Math.ceil(days / 7));
      rent = weeks * priceWeek;
      breakdown = `${weeks} нед. × ${money(priceWeek)}`;
    } else if (priceDay > 0) {
      rent = days * priceDay;
      breakdown = `${days} сут. × ${money(priceDay)}`;
    } else if (priceWeek > 0) {
      const weeks = Math.max(1, Math.ceil(days / 7));
      rent = weeks * priceWeek;
      breakdown = `${weeks} нед. × ${money(priceWeek)}`;
    }

    daysEl.textContent = `${periodLabel(from, to, days)} · ${breakdown}`;
    rentEl.textContent = `Аренда: ${money(rent)}`;
    depositEl.textContent = `Залог: ${money(deposit)} (${depositPercent}% от стоимости платья)`;
    totalEl.textContent = `Итого при выдаче: ${money(rent + deposit)}`;
  }

  [fromEl, toEl, periodEl].forEach((el) => {
    el.addEventListener('change', calc);
    el.addEventListener('input', calc);
  });
  calc();
})();
