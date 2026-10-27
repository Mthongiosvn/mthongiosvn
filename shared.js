// shared.js — GitHub API store
// 🟢 ĐỔI 2 DÒNG DƯỚI THÀNH CỦA M
(function (global) {
  'use strict';

  const OWNER  = 'mthongiosvn';   // ví dụ: 'minhbeostore'
  const REPO   = 'mthongiosvn';
  const BRANCH = 'main';
  const DATA_PATH = 'products.json';

  const DEFAULT_PRODUCTS = {
    mizze: {
      title: 'Mizze IOS Safe',
      image: 'https://raw.githubusercontent.com/MinhBeoStore/BEO-MOD-Z/main/IMG_0890.jpeg',
      packages: [
        { name: 'Day',   price: '20.000đ'  },
        { name: 'Week',  price: '75.000đ'  },
        { name: 'Month', price: '160.000đ' },
      ],
    },
    migul: {
      title: 'IPA Migul Pro',
      image: 'https://raw.githubusercontent.com/MinhBeoStore/BEO-MOD-Z/main/IMG_0888.jpeg',
      packages: [
        { name: 'Day',   price: '60.000đ'  },
        { name: 'Week',  price: '150.000đ' },
        { name: 'Month', price: '250.000đ' },
      ],
    },
    tipa: {
      title: 'TIPA SUDO',
      image: 'https://raw.githubusercontent.com/MinhBeoStore/BEO-MOD-Z/main/IMG_0889.jpeg',
      packages: [{ name: 'Month', price: '170.000đ' }],
    },
    fl0rk: {
      title: 'Fl0rk IPA',
      image: 'https://raw.githubusercontent.com/MinhBeoStore/BEO-MOD-Z/main/IMG_0891.jpeg',
      packages: [{ name: 'Month', price: '200.000đ' }],
      note: 'FFTH & MAX',
    },
  };

  const DEFAULT_TELEGRAM = 'https://t.me/MthongiosvnBot';

  function getToken() { return localStorage.getItem('gh_token') || ''; }
  function setToken(t) { localStorage.setItem('gh_token', t); }

  async function fetchJson() {
    try {
      const r = await fetch(
        `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${DATA_PATH}?t=${Date.now()}`
      );
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  async function loadProducts() {
    const data = await fetchJson();
    if (!data || !data.products || typeof data.products !== 'object') return DEFAULT_PRODUCTS;
    return data.products;
  }

  async function loadTelegram() {
    const data = await fetchJson();
    return (data && data.telegram) || DEFAULT_TELEGRAM;
  }

  async function getFileSha() {
    const r = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${DATA_PATH}?ref=${BRANCH}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return d.sha || null;
  }

  async function writeFile(products, telegram) {
    const token = getToken();
    if (!token) throw new Error('Chưa có token');

    const sha = await getFileSha();
    const content = JSON.stringify({ products, telegram }, null, 2);
    const b64 = btoa(unescape(encodeURIComponent(content)));

    const r = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${DATA_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `update ${new Date().toISOString()}`,
          content: b64,
          branch: BRANCH,
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (!r.ok) {
      let errText = '';
      try {
        const e = await r.json();
        errText = e.message || JSON.stringify(e);
      } catch {
        errText = `HTTP ${r.status}`;
      }

      if (r.status === 404) {
        throw new Error('GitHub 404. Kiểm tra: OWNER/REPO, quyền token, file products.json, branch.');
      }
      if (r.status === 401) {
        throw new Error('GitHub 401. Token sai/hết hạn. Bấm 🔑 dán token mới.');
      }
      if (r.status === 403) {
        throw new Error('GitHub 403. Token thiếu quyền Contents (Read+Write).');
      }
      if (r.status === 409) {
        throw new Error('GitHub 409. Conflict SHA. Refresh trang admin rồi thử lại.');
      }
      throw new Error('GitHub lỗi: ' + errText);
    }
    return true;
  }

  async function saveProducts(products) {
    const telegram = await loadTelegram();
    return writeFile(products, telegram);
  }

  async function saveTelegram(url) {
    const products = await loadProducts();
    return writeFile(products, url);
  }

  function slugify(input) {
    return String(input)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'p-' + Date.now();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function renderProductGrid(container, products, onOpen) {
    if (!container) return;
    container.innerHTML = '';
    Object.entries(products).forEach(([key, p]) => {
      const card = document.createElement('div');
      card.className = 'glass-card p-5 flex items-center justify-between cursor-pointer';
      card.innerHTML = `
        <div class="flex items-center gap-4 min-w-0">
          <img src="${escapeHtml(p.image || '')}" alt="" class="product-thumb">
          <div class="min-w-0">
            <p class="font-black text-slate-700 break-words">${escapeHtml(p.title || '')}</p>
            <p class="text-[11px] text-blue-500 font-bold break-words">Xem bảng giá →</p>
          </div>
        </div>
        <div class="btn-action flex-shrink-0"><i class="fa-solid fa-chevron-right"></i></div>
      `;
      card.addEventListener('click', () => onOpen(key, p));
      container.appendChild(card);
    });
  }

  global.BeoStore = {
    loadProducts, saveProducts, loadTelegram, saveTelegram,
    slugify, renderProductGrid, escapeHtml,
    getToken, setToken,
  };
})(window);
