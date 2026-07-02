(function () {
  'use strict';

  const STORAGE_KEY = 'gp_mobile_key';
  const POLL_MS = 25000;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  let state = {
    gallery: [],
    counts: { ordersNew: 0, rentalsNew: 0, mediaPending: 0 },
    lastPoll: null,
    lastNotifyTotal: 0,
    pollTimer: null,
    deferredInstall: null
  };

  function getKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function setKey(v) {
    localStorage.setItem(STORAGE_KEY, v);
  }

  function clearKey() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function showStatus(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'status is-show ' + (type || 'info');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMoney(n) {
    return (Number(n) || 0).toLocaleString('ru-RU') + ' ₽';
  }

  function formatDate(s) {
    if (!s) return '';
    const d = new Date(s.replace(' ', 'T'));
    if (Number.isNaN(d)) return s;
    return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async function api(path, options) {
    const key = getKey();
    const res = await fetch('/api/mobile' + path, {
      ...options,
      headers: {
        Authorization: 'Bearer ' + key,
        ...(options && options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options && options.headers ? options.headers : {})
      }
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {
      data = { error: text || 'Ошибка сервера' };
    }

    if (!res.ok) throw new Error(data.error || 'Ошибка ' + res.status);
    return data;
  }

  function showApp() {
    $('#screen-login').classList.remove('screen--active');
    $('#screen-login').hidden = true;
    $('#screen-app').hidden = false;
    $('#screen-app').classList.add('screen--active');
  }

  function showLogin() {
    stopPolling();
    $('#screen-app').hidden = true;
    $('#screen-app').classList.remove('screen--active');
    $('#screen-login').hidden = false;
    $('#screen-login').classList.add('screen--active');
  }

  async function login() {
    const key = $('#mobile-key').value.trim();
    if (!key) throw new Error('Введите ключ');
    setKey(key);
    await api('/ping');
    showApp();
    await refreshAll();
    startPolling();
    requestPushPermission();
    navigateHash();
  }

  function navigateHash() {
    const hash = (location.hash || '#inbox').slice(1);
    const panel = ['inbox', 'gallery', 'texts'].includes(hash) ? hash : 'inbox';
    switchPanel(panel);
  }

  function switchPanel(id) {
    $$('.bottom-nav button[data-panel]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.panel === id);
    });
    $$('.panel').forEach((p) => p.classList.toggle('is-active', p.id === 'panel-' + id));
    location.hash = id;
  }

  function updateBadges() {
    const total = (state.counts.ordersNew || 0) + (state.counts.rentalsNew || 0) + (state.counts.mediaPending || 0);
    const badge = $('#badge-total');
    const navBadge = $('#nav-badge');
    if (total > 0) {
      badge.hidden = false;
      badge.textContent = total;
      navBadge.hidden = false;
      navBadge.textContent = total;
    } else {
      badge.hidden = true;
      navBadge.hidden = true;
    }
    $('#stat-orders').textContent = state.counts.ordersNew || 0;
    $('#stat-rentals').textContent = state.counts.rentalsNew || 0;
    $('#stat-media').textContent = state.counts.mediaPending || 0;
    $('#header-sub').textContent = total > 0 ? `${total} новых заявок` : 'Всё спокойно';
  }

  function maybeNotify() {
    const total = (state.counts.ordersNew || 0) + (state.counts.rentalsNew || 0);
    if (total > state.lastNotifyTotal && state.lastNotifyTotal > 0) {
      const diff = total - state.lastNotifyTotal;
      showBrowserNotification(`Новых заявок: ${diff}`, 'Откройте GP Админ');
    }
    state.lastNotifyTotal = total;
  }

  function showBrowserNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: '/logo.png', badge: '/logo.png' });
    } catch (_) { /* ignore */ }
  }

  async function requestPushPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    try {
      await Notification.requestPermission();
    } catch (_) { /* ignore */ }
  }

  function renderInbox(data) {
    const list = $('#inbox-list');
    list.innerHTML = '';

    const items = [];

    for (const o of data.recentOrders || []) {
      items.push({
        type: 'order',
        id: o.id,
        title: `Заказ №${o.id}`,
        sub: o.product_title,
        who: o.customer_name,
        phone: o.phone,
        amount: o.amount,
        status: o.status,
        date: o.created_at,
        isNew: o.status === 'new'
      });
    }

    for (const r of data.recentRentals || []) {
      items.push({
        type: 'rental',
        id: r.id,
        title: `Аренда №${r.id}`,
        sub: r.item_title,
        who: r.customer_name,
        phone: r.phone,
        amount: r.amount,
        status: r.status,
        date: r.created_at,
        extra: `${r.rent_from} — ${r.rent_to}`,
        isNew: r.status === 'new'
      });
    }

    items.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    if (!items.length) {
      list.innerHTML = '<p class="hint card">Заявок пока нет</p>';
      return;
    }

    for (const item of items) {
      const el = document.createElement('article');
      el.className = 'inbox-item' + (item.isNew ? ' inbox-item--new' : '');
      el.innerHTML = `
        <div class="inbox-top">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="pill pill--${item.isNew ? 'new' : 'done'}">${item.isNew ? 'новая' : item.status}</span>
        </div>
        <p class="inbox-sub">${escapeHtml(item.sub)}</p>
        <p class="inbox-who">${escapeHtml(item.who)} · <a href="tel:${item.phone}">${escapeHtml(item.phone)}</a></p>
        ${item.extra ? `<p class="inbox-extra">${escapeHtml(item.extra)}</p>` : ''}
        <p class="inbox-meta">${formatMoney(item.amount)} · ${formatDate(item.date)}</p>
        ${item.isNew ? `<div class="inbox-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-confirm="${item.type}" data-id="${item.id}">✓ Принять</button>
        </div>` : ''}`;
      list.appendChild(el);
    }

    list.querySelectorAll('[data-confirm]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const type = btn.dataset.confirm;
          const id = btn.dataset.id;
          if (type === 'order') {
            await api(`/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status: 'confirmed' }) });
          } else {
            await api(`/rentals/${id}/status`, { method: 'POST', body: JSON.stringify({ status: 'confirmed' }) });
          }
          await pollEvents();
        } catch (err) {
          alert(err.message);
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  function renderGallery() {
    const list = $('#gallery-list');
    list.innerHTML = '';

    if (!state.gallery.length) {
      list.innerHTML = '<p class="hint card">Коллекция пуста</p>';
      return;
    }

    for (const item of state.gallery) {
      const el = document.createElement('article');
      el.className = 'dress-card' + (item.active ? '' : ' dress-card--off');
      el.innerHTML = `
        <img src="${item.image_path}" alt="" loading="lazy">
        <div class="dress-card-body">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${formatMoney(item.price)}</span>
          <span class="dress-card-tags">${item.active ? '' : 'скрыто · '}${item.for_rent ? 'аренда' : ''} ${item.for_order ? 'покупка' : ''}</span>
        </div>`;
      el.addEventListener('click', () => openDressForm(item));
      list.appendChild(el);
    }
  }

  function fillSettings(s) {
    $('#set-phone').value = s.phone || '';
    $('#set-hero-title').value = s.hero_title || '';
    $('#set-hero-sub').value = s.hero_subtitle || '';
    $('#set-rental-title').value = s.rental_title || '';
    $('#set-rental-text').value = s.rental_text || '';
    const hint = $('#telegram-hint');
    if (hint) {
      hint.textContent = s.telegramConfigured === false
        ? 'Telegram не настроен на сервере. Добавьте ADMIN_TELEGRAM_BOT_TOKEN в Render.'
        : 'Telegram подключён — уведомления приходят даже когда приложение закрыто.';
    }
  }

  async function refreshBootstrap() {
    const data = await api('/bootstrap');
    state.gallery = data.gallery || [];
    state.counts = data.counts || {};
    if (data.settings) fillSettings({ ...data.settings, telegramConfigured: data.telegramConfigured });
    renderGallery();
    updateBadges();
  }

  async function pollEvents() {
    const since = state.lastPoll || '1970-01-01 00:00:00';
    const data = await api('/events?since=' + encodeURIComponent(since));
    state.counts = data.counts || state.counts;
    state.lastPoll = new Date().toISOString().slice(0, 19).replace('T', ' ');
    renderInbox(data);
    updateBadges();
    maybeNotify();
  }

  async function refreshAll() {
    await refreshBootstrap();
    await pollEvents();
  }

  function startPolling() {
    stopPolling();
    state.pollTimer = setInterval(() => {
      pollEvents().catch(() => {});
    }, POLL_MS);
  }

  function stopPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  function openDressForm(item) {
    const dlg = $('#dress-dialog');
    const isNew = !item;
    $('#dress-form-title').textContent = isNew ? 'Новое платье' : 'Редактировать';
    $('#dress-id').value = isNew ? '' : item.id;
    $('#dress-title').value = isNew ? '' : item.title;
    $('#dress-desc').value = isNew ? '' : (item.description || '');
    $('#dress-price').value = isNew ? '' : item.price;
    $('#dress-active').checked = isNew ? true : !!item.active;
    $('#dress-rent').checked = isNew ? true : !!item.for_rent;
    $('#dress-buy').checked = isNew ? true : !!item.for_order;
    $('#dress-delete').hidden = isNew;
    $('#dress-photo').value = '';
    showStatus($('#dress-status'), '', '');

    const img = $('#dress-img');
    if (!isNew && item.image_path) {
      img.src = item.image_path;
      img.hidden = false;
    } else {
      img.hidden = true;
    }

    dlg.showModal();
  }

  async function saveDress(e) {
    e.preventDefault();
    const id = $('#dress-id').value;
    const isNew = !id;
    const status = $('#dress-status');
    const photo = $('#dress-photo').files[0];

    const payload = {
      title: $('#dress-title').value.trim(),
      description: $('#dress-desc').value.trim(),
      price: $('#dress-price').value,
      active: $('#dress-active').checked,
      for_rent: $('#dress-rent').checked,
      for_order: $('#dress-buy').checked
    };

    if (!payload.title) {
      showStatus(status, 'Укажите название', 'err');
      return;
    }

    try {
      showStatus(status, 'Сохраняем…', 'info');

      if (isNew) {
        if (!photo) throw new Error('Выберите фото');
        const fd = new FormData();
        fd.append('image', photo);
        fd.append('title', payload.title);
        fd.append('description', payload.description);
        fd.append('price', payload.price);
        await api('/gallery', { method: 'POST', body: fd });
      } else {
        await api('/gallery/' + id, { method: 'PUT', body: JSON.stringify(payload) });
        if (photo) {
          const fd = new FormData();
          fd.append('image', photo);
          await api('/gallery/' + id + '/photo', { method: 'POST', body: fd });
        }
      }

      $('#dress-dialog').close();
      await refreshBootstrap();
    } catch (err) {
      showStatus(status, err.message, 'err');
    }
  }

  async function deleteDress() {
    const id = $('#dress-id').value;
    if (!id || !confirm('Удалить платье с сайта?')) return;
    try {
      await api('/gallery/' + id, { method: 'DELETE' });
      $('#dress-dialog').close();
      await refreshBootstrap();
    } catch (err) {
      showStatus($('#dress-status'), err.message, 'err');
    }
  }

  async function saveTexts() {
    try {
      showStatus($('#texts-status'), 'Сохраняем…', 'info');
      await api('/settings', {
        method: 'POST',
        body: JSON.stringify({
          phone: $('#set-phone').value.trim(),
          hero_title: $('#set-hero-title').value.trim(),
          hero_subtitle: $('#set-hero-sub').value.trim(),
          rental_title: $('#set-rental-title').value.trim(),
          rental_text: $('#set-rental-text').value.trim()
        })
      });
      showStatus($('#texts-status'), 'Сохранено на сайте ✓', 'ok');
    } catch (err) {
      showStatus($('#texts-status'), err.message, 'err');
    }
  }

  function initPwa() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).catch(() => {});
    }

    const banner = $('#install-banner');
    const hint = $('#install-hint');
    const btnInstall = $('#btn-install');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      state.deferredInstall = e;
      banner.hidden = false;
      btnInstall.hidden = false;
      hint.textContent = 'Нажмите «Установить» — иконка появится на главном экране.';
    });

    btnInstall.addEventListener('click', async () => {
      if (!state.deferredInstall) return;
      state.deferredInstall.prompt();
      await state.deferredInstall.userChoice;
      state.deferredInstall = null;
      banner.hidden = true;
    });

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (isIos && !standalone) {
      banner.hidden = false;
      hint.textContent = 'iPhone: Поделиться ↗ → «На экран Домой».';
    }
  }

  function init() {
    initPwa();

    $$('.bottom-nav button[data-panel]').forEach((btn) => {
      btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
    });

    $('#btn-login').addEventListener('click', () => {
      login().catch((err) => showStatus($('#login-status'), err.message, 'err'));
    });

    $('#btn-logout').addEventListener('click', () => {
      clearKey();
      showLogin();
    });

    $('#btn-new-dress').addEventListener('click', () => openDressForm(null));
    $('#dress-close').addEventListener('click', () => $('#dress-dialog').close());
    $('#dress-form').addEventListener('submit', saveDress);
    $('#dress-delete').addEventListener('click', deleteDress);

    $('#dress-photo').addEventListener('change', () => {
      const f = $('#dress-photo').files[0];
      if (!f) return;
      const img = $('#dress-img');
      img.src = URL.createObjectURL(f);
      img.hidden = false;
    });

    $('#btn-save-texts').addEventListener('click', saveTexts);
    $('#btn-enable-push').addEventListener('click', requestPushPermission);

    window.addEventListener('hashchange', navigateHash);

    const saved = getKey();
    if (saved) {
      $('#mobile-key').value = saved;
      login().catch(() => {
        clearKey();
        showLogin();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
