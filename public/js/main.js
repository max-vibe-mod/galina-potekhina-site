(function () {
  'use strict';

  /* Header glass on scroll */
  const header = document.getElementById('site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Hero video — autoplay без звука */
  const heroVideo = document.getElementById('hero-video');
  if (heroVideo) {
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.setAttribute('muted', '');
    const playVideo = () => {
      const p = heroVideo.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    playVideo();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) playVideo();
    });
  }

  /* Mobile menu */
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('main-nav')?.classList.toggle('open');
  });

  /* Reveal on scroll */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  /* Smooth anchor scroll offset for fixed header */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top, behavior: 'smooth' });
      document.getElementById('main-nav')?.classList.remove('open');
    });
  });

  /* Fitting calendar */
  const calEl = document.getElementById('fitting-calendar');
  if (calEl) {
    const booked = JSON.parse(calEl.dataset.booked || '[]');
    const bookedSet = new Set(booked.map((b) => `${b.appointment_date}_${b.appointment_time}`));

    const dateInput = document.getElementById('fitting-date');
    const timeInput = document.getElementById('fitting-time');
    const selectedLabel = document.getElementById('fitting-selected');
    const slotsEl = document.getElementById('time-slots');
    const submitBtn = document.getElementById('fitting-submit');

    const SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    let viewDate = new Date();
    viewDate.setHours(0, 0, 0, 0);
    let selectedDate = null;
    let selectedTime = null;

    function fmtDate(d) {
      return d.toISOString().slice(0, 10);
    }

    function isPast(d) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d < today;
    }

    function isSunday(d) {
      return d.getDay() === 0;
    }

    function renderCalendar() {
      const y = viewDate.getFullYear();
      const m = viewDate.getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      let startPad = (first.getDay() + 6) % 7;

      const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

      let html = `<div class="cal-header">
        <button type="button" id="cal-prev" aria-label="Назад">‹</button>
        <span>${monthNames[m]} ${y}</span>
        <button type="button" id="cal-next" aria-label="Вперёд">›</button>
      </div><div class="cal-grid">`;

      DAY_NAMES.forEach((n) => { html += `<div class="cal-day-name">${n}</div>`; });

      for (let i = 0; i < startPad; i++) html += '<div class="cal-day empty"></div>';

      for (let day = 1; day <= last.getDate(); day++) {
        const d = new Date(y, m, day);
        const ds = fmtDate(d);
        const disabled = isPast(d) || isSunday(d);
        const sel = selectedDate === ds ? ' selected' : '';
        html += `<div class="cal-day${disabled ? ' disabled' : ''}${sel}" data-date="${ds}">${day}</div>`;
      }

      html += '</div>';
      calEl.innerHTML = html;

      calEl.querySelector('#cal-prev')?.addEventListener('click', () => {
        viewDate.setMonth(viewDate.getMonth() - 1);
        renderCalendar();
      });
      calEl.querySelector('#cal-next')?.addEventListener('click', () => {
        viewDate.setMonth(viewDate.getMonth() + 1);
        renderCalendar();
      });

      calEl.querySelectorAll('.cal-day[data-date]').forEach((cell) => {
        cell.addEventListener('click', () => {
          if (cell.classList.contains('disabled')) return;
          selectedDate = cell.dataset.date;
          selectedTime = null;
          if (dateInput) dateInput.value = selectedDate;
          if (timeInput) timeInput.value = '';
          renderCalendar();
          renderSlots();
          updateSubmit();
        });
      });
    }

    function renderSlots() {
      if (!slotsEl || !selectedDate) {
        if (slotsEl) slotsEl.innerHTML = '';
        return;
      }

      slotsEl.innerHTML = SLOTS.map((t) => {
        const key = `${selectedDate}_${t}`;
        const taken = bookedSet.has(key);
        return `<button type="button" class="time-slot${taken ? ' disabled' : ''}${selectedTime === t ? ' selected' : ''}" data-time="${t}" ${taken ? 'disabled' : ''}>${t}</button>`;
      }).join('');

      slotsEl.querySelectorAll('.time-slot:not(.disabled)').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedTime = btn.dataset.time;
          if (timeInput) timeInput.value = selectedTime;
          renderSlots();
          updateSubmit();
        });
      });
    }

    function updateSubmit() {
      if (selectedLabel) {
        selectedLabel.textContent = selectedDate && selectedTime
          ? `Выбрано: ${selectedDate} в ${selectedTime}`
          : selectedDate
            ? 'Выберите время'
            : 'Выберите дату и время';
      }
      if (submitBtn) submitBtn.disabled = !(selectedDate && selectedTime);
    }

    renderCalendar();
    updateSubmit();
  }

  /* Back to top */
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    const toggleBackToTop = () => {
      const show = window.scrollY > 480;
      backToTop.hidden = !show;
      backToTop.classList.toggle('is-visible', show);
    };
    window.addEventListener('scroll', toggleBackToTop, { passive: true });
    toggleBackToTop();
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* Buy dress modal */
  const buyModal = document.getElementById('buy-modal');
  if (buyModal) {
    const titleEl = buyModal.querySelector('.buy-modal__title');
    const priceEl = buyModal.querySelector('#buy-modal-price');

    const openBuyModal = (btn) => {
      const title = btn.dataset.title || 'Платье';
      const price = Number(btn.dataset.price || 0);
      if (titleEl) titleEl.textContent = title;
      if (priceEl) {
        priceEl.textContent = price > 0
          ? `${price.toLocaleString('ru-RU')} ₽`
          : '';
        priceEl.hidden = !(price > 0);
      }
      buyModal.hidden = false;
      buyModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      buyModal.querySelector('.buy-modal__close')?.focus();
    };

    const closeBuyModal = () => {
      buyModal.hidden = true;
      buyModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    };

    document.querySelectorAll('.js-buy-dress').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openBuyModal(btn);
      });
    });

    buyModal.querySelectorAll('[data-buy-close]').forEach((el) => {
      el.addEventListener('click', closeBuyModal);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !buyModal.hidden) closeBuyModal();
    });
  }

  /* Dashboard nav highlight on scroll */
  const dashLinks = document.querySelectorAll('.dash-nav-link');
  const dashBlocks = document.querySelectorAll('.dashboard-block[id]');
  if (dashLinks.length && dashBlocks.length) {
    const dashObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            dashLinks.forEach((l) => {
              l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`);
            });
          }
        });
      },
      { threshold: 0.3, rootMargin: '-100px 0px -50% 0px' }
    );
    dashBlocks.forEach((b) => dashObserver.observe(b));
  }
})();
