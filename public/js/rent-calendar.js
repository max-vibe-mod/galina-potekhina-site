(function () {
  'use strict';

  const calEl = document.getElementById('rent-calendar');
  const fromInput = document.getElementById('rent_from');
  const toInput = document.getElementById('rent_to');
  const summaryEl = document.getElementById('rent-period-summary');
  const hintEl = document.getElementById('rent-calendar-hint');

  if (!calEl || !fromInput || !toInput) return;

  const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const MONTHS_GEN = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  let viewDate = new Date();
  viewDate.setHours(0, 0, 0, 0);
  let startDate = fromInput.value || null;
  let endDate = toInput.value || null;
  let pickingEnd = false;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toIso(y, m, d) {
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  }

  function parseIso(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function fmtLong(iso) {
    const d = parseIso(iso);
    if (!d) return '';
    return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()} г.`;
  }

  function today() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  function isPast(d) {
    return d < today();
  }

  function between(iso, a, b) {
    if (!a || !b) return false;
    const x = parseIso(iso);
    const s = parseIso(a);
    const e = parseIso(b);
    if (!x || !s || !e) return false;
    const lo = s <= e ? s : e;
    const hi = s <= e ? e : s;
    return x >= lo && x <= hi;
  }

  function countDays(from, to) {
    const s = parseIso(from);
    const e = parseIso(to);
    if (!s || !e || e < s) return 0;
    return Math.max(1, Math.ceil((e - s) / 86400000) + 1);
  }

  function syncInputs() {
    fromInput.value = startDate || '';
    toInput.value = endDate || '';
    fromInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function updateSummary() {
    if (!summaryEl) return;
    if (startDate && endDate) {
      const days = countDays(startDate, endDate);
      summaryEl.textContent = `${fmtLong(startDate)} — ${fmtLong(endDate)} · ${days} ${daysLabel(days)}`;
      summaryEl.classList.add('rent-period-summary--ready');
      if (hintEl) hintEl.textContent = 'Период выбран. Можно изменить, нажав другие даты.';
    } else if (startDate) {
      summaryEl.textContent = `Начало: ${fmtLong(startDate)}. Выберите дату окончания.`;
      summaryEl.classList.remove('rent-period-summary--ready');
      if (hintEl) hintEl.textContent = 'Шаг 2: нажмите дату окончания аренды.';
    } else {
      summaryEl.textContent = 'Даты не выбраны';
      summaryEl.classList.remove('rent-period-summary--ready');
      if (hintEl) hintEl.textContent = 'Шаг 1: нажмите дату начала аренды.';
    }
  }

  function daysLabel(n) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m100 >= 11 && m100 <= 14) return 'календарных дней';
    if (m10 === 1) return 'календарный день';
    if (m10 >= 2 && m10 <= 4) return 'календарных дня';
    return 'календарных дней';
  }

  function render() {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startPad = (first.getDay() + 6) % 7;

    let html = `<div class="cal-header">
      <button type="button" class="rent-cal-nav" data-dir="prev" aria-label="Предыдущий месяц">‹</button>
      <span>${MONTHS[m]} ${y}</span>
      <button type="button" class="rent-cal-nav" data-dir="next" aria-label="Следующий месяц">›</button>
    </div><div class="cal-grid">`;

    DAY_NAMES.forEach((n) => { html += `<div class="cal-day-name">${n}</div>`; });
    for (let i = 0; i < startPad; i++) html += '<div class="cal-day empty"></div>';

    for (let day = 1; day <= last.getDate(); day++) {
      const iso = toIso(y, m, day);
      const d = new Date(y, m, day);
      const disabled = isPast(d);
      const inRange = startDate && endDate && between(iso, startDate, endDate);
      const isStart = iso === startDate;
      const isEnd = iso === endDate;
      let cls = 'cal-day';
      if (disabled) cls += ' disabled';
      if (inRange) cls += ' in-range';
      if (isStart) cls += ' range-start selected';
      if (isEnd) cls += ' range-end selected';
      if (isStart && isEnd) cls += ' range-single';
      html += `<div class="${cls}" data-date="${iso}" role="button" tabindex="${disabled ? -1 : 0}">${day}</div>`;
    }

    html += '</div>';
    calEl.innerHTML = html;

    calEl.querySelectorAll('.rent-cal-nav').forEach((btn) => {
      btn.addEventListener('click', () => {
        viewDate.setMonth(viewDate.getMonth() + (btn.dataset.dir === 'next' ? 1 : -1));
        render();
      });
    });

    calEl.querySelectorAll('.cal-day[data-date]').forEach((cell) => {
      const pick = () => {
        if (cell.classList.contains('disabled')) return;
        const iso = cell.dataset.date;

        if (!startDate || (startDate && endDate) || !pickingEnd) {
          startDate = iso;
          endDate = null;
          pickingEnd = true;
        } else {
          endDate = iso;
          if (parseIso(endDate) < parseIso(startDate)) {
            const tmp = startDate;
            startDate = endDate;
            endDate = tmp;
          }
          pickingEnd = false;
        }

        syncInputs();
        updateSummary();
        render();
      };
      cell.addEventListener('click', pick);
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      });
    });
  }

  if (startDate && !endDate) pickingEnd = true;
  if (startDate) {
    const d = parseIso(startDate);
    if (d) viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
  }

  updateSummary();
  render();

  window.rentCalendarFormat = { fmtLong, countDays, daysLabel };

  const form = document.getElementById('rent-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      if (!startDate || !endDate) {
        e.preventDefault();
        if (hintEl) {
          hintEl.textContent = 'Сначала выберите даты начала и окончания в календаре.';
          hintEl.style.color = '#a33';
        }
        calEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
})();
