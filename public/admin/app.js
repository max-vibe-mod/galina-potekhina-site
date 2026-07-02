(function () {
  'use strict';

  const STORAGE_TOKEN = 'gp_admin_gh_token';
  const STORAGE_REPO = 'gp_admin_gh_repo';
  const BRANCH = 'main';
  const CATALOG_PATH = 'public/data/gallery-catalog.json';
  const UPLOAD_DIR = 'public/uploads/evening';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let deferredInstall = null;

  function showStatus(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'status is-show ' + (type || 'info');
  }

  function getToken() {
    return localStorage.getItem(STORAGE_TOKEN) || '';
  }

  function getRepo() {
    return localStorage.getItem(STORAGE_REPO) || 'max-vibe-mod/galina-potekhina-site';
  }

  function b64FromBytes(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function b64ToUtf8(b64) {
    const bin = atob(b64.replace(/\n/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    return b64FromBytes(bytes);
  }

  async function ghFetch(path, options) {
    const token = getToken();
    if (!token) throw new Error('Сначала сохраните GitHub Token');

    const repo = getRepo();
    const url = path.startsWith('http')
      ? path
      : `https://api.github.com/repos/${repo}/contents/${path}?ref=${BRANCH}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {})
      }
    });

    if (res.status === 404) return null;

    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try {
        const j = JSON.parse(text);
        msg = j.message || text;
      } catch (_) { /* ignore */ }
      throw new Error(msg);
    }

    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (_) {
      return text;
    }
  }

  async function ghGetFile(path) {
    return ghFetch(path);
  }

  async function ghPutFile(path, base64Content, message, sha) {
    const body = {
      message,
      content: base64Content,
      branch: BRANCH
    };
    if (sha) body.sha = sha;

    return ghFetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  async function loadCatalogFromGithub() {
    const remote = await ghGetFile(CATALOG_PATH);
    if (!remote) return { version: 1, settings: {}, items: [] };
    return JSON.parse(b64ToUtf8(remote.content));
  }

  async function loadCatalog() {
    const live = await fetch('/data/gallery-catalog.json?_=' + Date.now());
    if (live.ok) return live.json();

    const remote = await ghGetFile(CATALOG_PATH);
    if (!remote) return { version: 1, settings: {}, items: [] };
    return JSON.parse(b64ToUtf8(remote.content));
  }

  async function saveCatalog(catalog, message) {
    const remote = await ghGetFile(CATALOG_PATH);
    const sha = remote && remote.sha;
    const json = JSON.stringify(catalog, null, 2) + '\n';
    await ghPutFile(CATALOG_PATH, utf8ToB64(json), message, sha);
  }

  function makeFileKey(title) {
    const slug = (title || 'dress')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
    return (slug || 'dress') + '-' + Date.now().toString(36);
  }

  function compressImage(file, maxSide, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.width;
        let h = img.height;
        if (w > maxSide || h > maxSide) {
          if (w > h) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          } else {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Не удалось сжать фото'));
            resolve(blob);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Не удалось прочитать фото'));
      };
      img.src = url;
    });
  }

  async function blobToBase64(blob) {
    const buf = await blob.arrayBuffer();
    return b64FromBytes(new Uint8Array(buf));
  }

  function renderGallery(catalog) {
    const grid = $('#gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const items = (catalog.items || []).filter((i) => i.active !== false);
    if (!items.length) {
      grid.innerHTML = '<p class="hint">Коллекция пуста</p>';
      return;
    }

    items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    for (const item of items) {
      const ext = item.ext || '.png';
      const src = `/uploads/evening/${item.fileKey}${ext}`;
      const el = document.createElement('article');
      el.className = 'gallery-item';
      el.innerHTML = `
        <img src="${src}" alt="" loading="lazy" onerror="this.style.opacity=0.3">
        <div class="meta">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${formatPrice(item.price)}</span>
        </div>`;
      grid.appendChild(el);
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatPrice(n) {
    const v = Number(n) || 0;
    return v.toLocaleString('ru-RU') + ' ₽';
  }

  function fillSettingsForm(catalog) {
    const s = catalog.settings || {};
    $('#set-phone').value = s.phone || '';
    $('#set-hero-title').value = s.hero_title || '';
    $('#set-hero-sub').value = s.hero_subtitle || '';
  }

  async function refreshGallery() {
    try {
      const catalog = await loadCatalog();
      renderGallery(catalog);
      fillSettingsForm(catalog);
    } catch (err) {
      showStatus($('#upload-status'), err.message, 'err');
    }
  }

  async function verifyToken() {
    const token = $('#gh-token').value.trim();
    if (!token) throw new Error('Введите токен');

    const repo = $('#gh-repo').value.trim() || 'max-vibe-mod/galina-potekhina-site';
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_REPO, repo);

    await ghGetFile(CATALOG_PATH);
    showStatus($('#connect-status'), 'Токен работает ✓', 'ok');
    await refreshGallery();
  }

  async function uploadDress() {
    const fileInput = $('#photo-input');
    const title = $('#dress-title').value.trim();
    const description = $('#dress-desc').value.trim();
    const price = Number($('#dress-price').value) || 0;

    if (!fileInput.files || !fileInput.files[0]) {
      throw new Error('Выберите фото');
    }
    if (!title) throw new Error('Укажите название');

    showStatus($('#upload-status'), 'Сжимаем фото…', 'info');
    const blob = await compressImage(fileInput.files[0], 1400, 0.82);
    const base64 = await blobToBase64(blob);

    const fileKey = makeFileKey(title);
    const imagePath = `${UPLOAD_DIR}/${fileKey}.jpg`;

    showStatus($('#upload-status'), 'Загружаем фото в GitHub…', 'info');
    await ghPutFile(imagePath, base64, `admin: фото платья «${title}»`);

    showStatus($('#upload-status'), 'Обновляем каталог…', 'info');
    const catalog = await loadCatalogFromGithub();
    if (!Array.isArray(catalog.items)) catalog.items = [];

    const maxOrder = catalog.items.reduce((m, i) => Math.max(m, i.sort_order || 0), 0);
    catalog.items.push({
      fileKey,
      ext: '.jpg',
      title,
      description,
      price,
      sort_order: maxOrder + 1,
      active: true
    });

    await saveCatalog(catalog, `admin: добавлено платье «${title}»`);

    showStatus(
      $('#upload-status'),
      'Готово! Render обновит сайт за 2–5 минут.',
      'ok'
    );

    fileInput.value = '';
    $('#photo-preview').hidden = true;
    $('#file-pick').classList.remove('has-file');
    $('#file-pick-label').textContent = '📷 Нажмите — выбрать фото';
    $('#dress-title').value = '';
    $('#dress-desc').value = '';
    $('#dress-price').value = '';

    await refreshGallery();
  }

  async function saveTexts() {
    showStatus($('#texts-status'), 'Сохраняем…', 'info');
    const catalog = await loadCatalogFromGithub();
    catalog.settings = catalog.settings || {};
    catalog.settings.phone = $('#set-phone').value.trim();
    catalog.settings.hero_title = $('#set-hero-title').value.trim();
    catalog.settings.hero_subtitle = $('#set-hero-sub').value.trim();

    await saveCatalog(catalog, 'admin: обновлены тексты сайта');
    showStatus($('#texts-status'), 'Тексты отправлены в GitHub ✓', 'ok');
  }

  function initNav() {
    $$('.bottom-nav button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.panel;
        $$('.bottom-nav button').forEach((b) => b.classList.toggle('is-active', b === btn));
        $$('.panel').forEach((p) => p.classList.toggle('is-active', p.id === 'panel-' + id));
      });
    });
  }

  function initPhotoPick() {
    const input = $('#photo-input');
    const preview = $('#photo-preview');
    const pick = $('#file-pick');
    const label = $('#file-pick-label');

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      pick.classList.add('has-file');
      label.textContent = file.name;
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    });
  }

  function initTokenUi() {
    const saved = getToken();
    if (saved) $('#gh-token').value = saved;
    $('#gh-repo').value = getRepo();

    $('#token-toggle').addEventListener('click', () => {
      const inp = $('#gh-token');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    $('#btn-save-token').addEventListener('click', () => {
      verifyToken().catch((err) => showStatus($('#connect-status'), err.message, 'err'));
    });
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
      deferredInstall = e;
      banner.hidden = false;
      btnInstall.hidden = false;
      hint.textContent = 'Нажмите «Установить» — приложение появится на главном экране.';
    });

    btnInstall.addEventListener('click', async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      banner.hidden = true;
    });

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

    if (isIos && !isStandalone) {
      banner.hidden = false;
      hint.textContent =
        'iPhone: нажмите «Поделиться» ↗ в Safari → «На экран Домой».';
    }
  }

  function initActions() {
    $('#btn-refresh-gallery').addEventListener('click', refreshGallery);
    $('#btn-upload-dress').addEventListener('click', () => {
      $('#btn-upload-dress').disabled = true;
      uploadDress()
        .catch((err) => showStatus($('#upload-status'), err.message, 'err'))
        .finally(() => {
          $('#btn-upload-dress').disabled = false;
        });
    });
    $('#btn-save-texts').addEventListener('click', () => {
      saveTexts().catch((err) => showStatus($('#texts-status'), err.message, 'err'));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initPhotoPick();
    initTokenUi();
    initPwa();
    initActions();
    refreshGallery();
  });
})();
