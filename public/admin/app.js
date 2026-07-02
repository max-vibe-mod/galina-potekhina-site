(function () {
  'use strict';

  const STORAGE_KEY = 'gp_mobile_key';
  const POLL_MS = 20000;
  const API_BASE = (window.GP_API_BASE || '').replace(/\/$/, '');

  function apiUrl(path) {
    return (API_BASE || '') + '/api/mobile' + path;
  }

  function mediaUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return (API_BASE || '') + path;
  }

  let LocalNotifications = null;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  let state = {
    gallery: [],
    counts: { ordersNew: 0, rentalsNew: 0, mediaPending: 0 },
    lastPoll: null,
    initialPollDone: false,
    pollTimer: null,
    notifyGranted: false
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
    const res = await fetch(apiUrl(path), {
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
    state.initialPollDone = false;
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
    await requestPushPermission(true);
    navigateHash();
  }

  function navigateHash() {
    const hash = (location.hash || '#inbox').slice(1);
    const panel = ['inbox', 'gallery', 'texts'].includes(hash) ? hash : 'inbox';
    switchPanel(panel);
  }

  function switchPanel(id) {
    $$('.bottom-nav .nav-btn[data-panel]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.panel === id);
    });
    $$('.panel').forEach((p) => p.classList.toggle('is-active', p.id === 'panel-' + id));
    location.hash = id;
  }

  function updateBadges() {
    const total = (state.counts.ordersNew || 0) + (state.counts.rentalsNew || 0) + (state.counts.mediaPending || 0);
    const navBadge = $('#nav-badge');
    if (total > 0) {
      navBadge.hidden = false;
      navBadge.textContent = total;
    } else {
      navBadge.hidden = true;
    }
    $('#stat-orders').textContent = state.counts.ordersNew || 0;
    $('#stat-rentals').textContent = state.counts.rentalsNew || 0;
    $('#stat-media').textContent = state.counts.mediaPending || 0;

    const newTotal = (state.counts.ordersNew || 0) + (state.counts.rentalsNew || 0);
    $('#header-sub').textContent = newTotal > 0
      ? `${newTotal} новых заявок`
      : 'Всё спокойно';
  }

  function updateNotifyBanner() {
    const banner = $('#notify-banner');
    if (!banner) return;

    if (state.notifyGranted) {
      banner.hidden = false;
      banner.classList.add('is-ok');
      banner.innerHTML = `
        <div class="notify-banner-text">
          <strong>Уведомления включены</strong>
          <span>О новых заказах и аренде сообщим сразу</span>
        </div>`;
      return;
    }

    banner.hidden = false;
    banner.classList.remove('is-ok');
    banner.innerHTML = `
      <div class="notify-banner-text">
        <strong>Уведомления выключены</strong>
        <span>Включите — и вы узнаете о новых заказах сразу</span>
      </div>
      <button type="button" class="btn btn-primary btn-compact" id="btn-enable-push">Включить</button>`;
    $('#btn-enable-push')?.addEventListener('click', () => requestPushPermission(true));
  }

  async function checkNotifyPermission() {
    if (LocalNotifications) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        state.notifyGranted = perm.display === 'granted';
        updateNotifyBanner();
        return;
      } catch (_) { /* fallback */ }
    }
    if ('Notification' in window) {
      state.notifyGranted = Notification.permission === 'granted';
    }
    updateNotifyBanner();
  }

  function showOrderAlert(type, item) {
    const isOrder = type === 'order';
    const title = isOrder ? `Новый заказ №${item.id}` : `Новая аренда №${item.id}`;
    const product = isOrder ? item.product_title : item.item_title;
    const body = `${product}\n${item.customer_name} · ${item.phone}\n${formatMoney(item.amount)}`;

    const dlg = $('#alert-dialog');
    $('#alert-title').textContent = title;
    $('#alert-body').textContent = body;
    if (dlg && !dlg.open) dlg.showModal();

    pushNotify(title, `${product} — ${item.customer_name}`);
  }

  function checkNewEvents(data) {
    if (!state.initialPollDone) return;

    for (const o of data.orders || []) {
      showOrderAlert('order', o);
    }
    for (const r of data.rentals || []) {
      showOrderAlert('rental', r);
    }
  }

  async function pushNotify(title, body) {
    if (LocalNotifications && state.notifyGranted) {
      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now() % 2147483647,
            title,
            body,
            channelId: 'gp-orders',
            schedule: { at: new Date(Date.now() + 400) }
          }]
        });
        return;
      } catch (_) { /* fallback */ }
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: 'logo.png' });
      } catch (_) { /* ignore */ }
    }
  }

  async function requestPushPermission(showFeedback) {
    if (LocalNotifications) {
      try {
        await LocalNotifications.createChannel({
          id: 'gp-orders',
          name: 'Заявки студии',
          description: 'Новые заказы и аренда',
          importance: 5,
          vibration: true
        });
        const perm = await LocalNotifications.requestPermissions();
        state.notifyGranted = perm.display === 'granted';
        updateNotifyBanner();
        if (showFeedback && !state.notifyGranted) {
          alert('Разрешите уведомления в настройках телефона для GP Админ');
        }
        return state.notifyGranted;
      } catch (err) {
        if (showFeedback) alert('Не удалось включить уведомления: ' + (err.message || err));
      }
    }

    if (!('Notification' in window)) {
      if (showFeedback) alert('Уведомления недоступны в этой среде');
      return false;
    }

    if (Notification.permission === 'granted') {
      state.notifyGranted = true;
      updateNotifyBanner();
      return true;
    }

    try {
      const perm = await Notification.requestPermission();
      state.notifyGranted = perm === 'granted';
      updateNotifyBanner();
      if (showFeedback && !state.notifyGranted) {
        alert('Разрешите уведомления в настройках браузера');
      }
      return state.notifyGranted;
    } catch (_) {
      return false;
    }
  }

  async function initNative() {
    if (window.Capacitor?.Plugins?.LocalNotifications) {
      LocalNotifications = window.Capacitor.Plugins.LocalNotifications;
      await checkNotifyPermission();
    } else {
      await checkNotifyPermission();
    }
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
      list.innerHTML = '<p class="hint card">Заявок пока нет — всё чисто</p>';
      return;
    }

    for (const item of items) {
      const el = document.createElement('article');
      el.className = 'inbox-item' + (item.isNew ? ' inbox-item--new' : '');
      const typePill = item.type === 'order' ? 'pill--order' : 'pill--rental';
      const typeLabel = item.type === 'order' ? 'Заказ' : 'Аренда';
      el.innerHTML = `
        <div class="inbox-top">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="pill ${item.isNew ? 'pill--new' : 'pill--done'}">${item.isNew ? 'новая' : item.status}</span>
        </div>
        <span class="pill ${typePill}" style="display:inline-block;margin-bottom:6px">${typeLabel}</span>
        <p class="inbox-sub">${escapeHtml(item.sub)}</p>
        <p class="inbox-who">${escapeHtml(item.who)} · <a href="tel:${item.phone}">${escapeHtml(item.phone)}</a></p>
        ${item.extra ? `<p class="inbox-extra">${escapeHtml(item.extra)}</p>` : ''}
        <p class="inbox-meta">${formatMoney(item.amount)} · ${formatDate(item.date)}</p>
        <div class="action-row">
          ${item.isNew ? `<button type="button" class="btn btn-success btn-sm" data-confirm="${item.type}" data-id="${item.id}">✓ Принять</button>` : ''}
          <button type="button" class="btn btn-danger btn-sm" data-delete="${item.type}" data-id="${item.id}">Удалить</button>
        </div>`;
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

    list.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.delete;
        const id = btn.dataset.id;
        const label = type === 'order' ? 'заказ' : 'заявку на аренду';
        if (!confirm(`Удалить ${label} №${id}? Это действие нельзя отменить.`)) return;
        btn.disabled = true;
        try {
          await api(`/${type === 'order' ? 'orders' : 'rentals'}/${id}`, { method: 'DELETE' });
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
      list.innerHTML = '<p class="hint card">Коллекция пуста — добавьте первое платье</p>';
      return;
    }

    for (const item of state.gallery) {
      const el = document.createElement('article');
      el.className = 'dress-card' + (item.active ? '' : ' dress-card--off');
      el.innerHTML = `
        <img src="${mediaUrl(item.image_path)}" alt="" loading="lazy">
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
  }

  async function refreshBootstrap() {
    const data = await api('/bootstrap');
    state.gallery = data.gallery || [];
    state.counts = data.counts || {};
    if (data.settings) fillSettings(data.settings);
    renderGallery();
    updateBadges();
  }

  async function pollEvents() {
    const since = state.lastPoll || '1970-01-01 00:00:00';
    const data = await api('/events?since=' + encodeURIComponent(since));
    checkNewEvents(data);
    state.counts = data.counts || state.counts;
    state.lastPoll = new Date().toISOString().slice(0, 19).replace('T', ' ');
    state.initialPollDone = true;
    renderInbox(data);
    updateBadges();
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
      img.src = mediaUrl(item.image_path);
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

  function init() {
    initNative();

    $$('.bottom-nav .nav-btn[data-panel]').forEach((btn) => {
      btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
    });

    $('#btn-login').addEventListener('click', () => {
      login().catch((err) => showStatus($('#login-status'), err.message, 'err'));
    });

    $('#btn-logout').addEventListener('click', () => {
      if (!confirm('Выйти из панели?')) return;
      clearKey();
      showLogin();
    });

    $('#btn-refresh').addEventListener('click', () => {
      refreshAll().catch((err) => alert(err.message));
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

    $('#alert-close').addEventListener('click', () => $('#alert-dialog').close());
    $('#alert-open-inbox').addEventListener('click', () => {
      $('#alert-dialog').close();
      switchPanel('inbox');
    });

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
