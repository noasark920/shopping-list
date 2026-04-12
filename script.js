// =============================================
// データ管理
// =============================================
const STORAGE_KEYS = {
  categories: 'shoppingList_categories',
  items: 'shoppingList_items',
};

function loadData(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ID生成
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// =============================================
// 状態
// =============================================
let categories = loadData(STORAGE_KEYS.categories);
let items = loadData(STORAGE_KEYS.items);
let activeTab = 'list'; // 'list' | 'categories' | 'items'

// =============================================
// カテゴリ操作
// =============================================
function addCategory(name, sortOrder) {
  const cat = { id: generateId(), name, sortOrder: Number(sortOrder) };
  categories.push(cat);
  saveData(STORAGE_KEYS.categories, categories);
}

function updateCategory(id, name, sortOrder) {
  const cat = categories.find(c => c.id === id);
  if (cat) {
    cat.name = name;
    cat.sortOrder = Number(sortOrder);
    saveData(STORAGE_KEYS.categories, categories);
  }
}

function deleteCategory(id) {
  const inUse = items.some(item => item.categoryId === id);
  if (inUse) {
    showToast('このカテゴリを使っている商品があるため削除できません。', 'error');
    return false;
  }
  categories = categories.filter(c => c.id !== id);
  saveData(STORAGE_KEYS.categories, categories);
  return true;
}

function getSortedCategories() {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

// =============================================
// 商品操作
// =============================================
function addItem(name, categoryId, sortOrder) {
  const item = {
    id: generateId(),
    name,
    categoryId: categoryId || null,
    sortOrder: Number(sortOrder),
    buyThisTime: false,
    purchased: false,
  };
  items.push(item);
  saveData(STORAGE_KEYS.items, items);
}

function updateItem(id, name, categoryId, sortOrder) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.name = name;
    item.categoryId = categoryId || null;
    item.sortOrder = Number(sortOrder);
    saveData(STORAGE_KEYS.items, items);
  }
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveData(STORAGE_KEYS.items, items);
}

function toggleBuyThisTime(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.buyThisTime = !item.buyThisTime;
    if (!item.buyThisTime) item.purchased = false;
    saveData(STORAGE_KEYS.items, items);
  }
}

function togglePurchased(id) {
  const item = items.find(i => i.id === id);
  if (item && item.buyThisTime) {
    item.purchased = !item.purchased;
    saveData(STORAGE_KEYS.items, items);
  }
}

function getSortedItems() {
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  return [...items].sort((a, b) => {
    // 1st: sortOrder
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    // 2nd: category sortOrder
    const catA = catMap[a.categoryId];
    const catB = catMap[b.categoryId];
    const csA = catA ? catA.sortOrder : Infinity;
    const csB = catB ? catB.sortOrder : Infinity;
    if (csA !== csB) return csA - csB;
    return a.name.localeCompare(b.name);
  });
}

// =============================================
// トースト通知
// =============================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--show'));
  setTimeout(() => {
    toast.classList.remove('toast--show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}

// =============================================
// モーダル
// =============================================
function openModal(modalId) {
  const el = document.getElementById(modalId);
  el.classList.add('modal--open');
  document.body.classList.add('body--modal-open');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  el.classList.remove('modal--open');
  document.body.classList.remove('body--modal-open');
}

// 確認モーダル（confirm() の代替）
function showConfirm(message, onOk, okLabel = '削除する') {
  document.getElementById('confirm-message').textContent = message;
  openModal('confirm-modal');
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');
  // 以前のリスナー削除のためクローン置き換え
  const newOk = okBtn.cloneNode(true);
  const newCancel = cancelBtn.cloneNode(true);
  newOk.textContent = okLabel;
  okBtn.replaceWith(newOk);
  cancelBtn.replaceWith(newCancel);
  newOk.addEventListener('click', () => {
    closeModal('confirm-modal');
    onOk();
  });
  newCancel.addEventListener('click', () => closeModal('confirm-modal'));
}

// カテゴリ追加モーダル
function openAddCategoryModal() {
  document.getElementById('cat-modal-title').textContent = 'カテゴリを追加';
  document.getElementById('cat-form').dataset.mode = 'add';
  delete document.getElementById('cat-form').dataset.editId;
  document.getElementById('cat-name').value = '';
  document.getElementById('cat-sort').value = (categories.length + 1) * 10;
  openModal('cat-modal');
  document.getElementById('cat-name').focus();
}

function openEditCategoryModal(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;
  document.getElementById('cat-modal-title').textContent = 'カテゴリを編集';
  const form = document.getElementById('cat-form');
  form.dataset.mode = 'edit';
  form.dataset.editId = id;
  document.getElementById('cat-name').value = cat.name;
  document.getElementById('cat-sort').value = cat.sortOrder;
  openModal('cat-modal');
  document.getElementById('cat-name').focus();
}

// 商品追加モーダル
function openAddItemModal() {
  document.getElementById('item-modal-title').textContent = '商品を追加';
  const form = document.getElementById('item-form');
  form.dataset.mode = 'add';
  delete form.dataset.editId;
  document.getElementById('item-name').value = '';
  document.getElementById('item-sort').value = (items.length + 1) * 10;
  populateCategorySelect('item-category', null);
  openModal('item-modal');
  document.getElementById('item-name').focus();
}

function openEditItemModal(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  document.getElementById('item-modal-title').textContent = '商品を編集';
  const form = document.getElementById('item-form');
  form.dataset.mode = 'edit';
  form.dataset.editId = id;
  document.getElementById('item-name').value = item.name;
  document.getElementById('item-sort').value = item.sortOrder;
  populateCategorySelect('item-category', item.categoryId);
  openModal('item-modal');
  document.getElementById('item-name').focus();
}

function populateCategorySelect(selectId, selectedCategoryId) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">-- カテゴリなし --</option>';
  getSortedCategories().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    if (cat.id === selectedCategoryId) opt.selected = true;
    sel.appendChild(opt);
  });
}

// =============================================
// レンダリング
// =============================================

function renderTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('tab-btn--active', btn.dataset.tab === activeTab);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('tab-panel--active', panel.id === `panel-${activeTab}`);
  });
}

// ---- 買い物リストタブ ----
function renderListTab() {
  const container = document.getElementById('list-content');
  const buyItems = getSortedItems().filter(i => i.buyThisTime);

  if (buyItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🛒</div>
        <p>「今回買う」にチェックした商品がここに表示されます。</p>
      </div>`;
    return;
  }

  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  // カテゴリ別にグループ化
  const grouped = {};
  const NO_CAT = '__nocat__';
  buyItems.forEach(item => {
    const key = item.categoryId && catMap[item.categoryId] ? item.categoryId : NO_CAT;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  // カテゴリ順で並び替え
  const sortedCatMap = getSortedCategories().reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
  const orderedKeys = [
    ...Object.keys(grouped).filter(k => k !== NO_CAT).sort((a, b) => {
      const ca = sortedCatMap[a], cb = sortedCatMap[b];
      return (ca ? ca.sortOrder : 0) - (cb ? cb.sortOrder : 0);
    }),
    ...(grouped[NO_CAT] ? [NO_CAT] : []),
  ];

  let html = '';
  orderedKeys.forEach(key => {
    const catName = key === NO_CAT ? 'カテゴリなし' : (catMap[key] ? catMap[key].name : 'カテゴリなし');
    html += `<div class="category-group">
      <div class="category-group__header">${escapeHtml(catName)}</div>`;
    grouped[key].forEach(item => {
      const purchasedClass = item.purchased ? 'list-item--purchased' : '';
      html += `
        <div class="list-item ${purchasedClass}" data-id="${item.id}">
          <button class="purchased-btn ${item.purchased ? 'purchased-btn--done' : ''}"
            onclick="handleTogglePurchased('${item.id}')"
            title="${item.purchased ? '購入取り消し' : '購入済みにする'}">
            ${item.purchased ? '✓' : ''}
          </button>
          <span class="list-item__name">${escapeHtml(item.name)}</span>
        </div>`;
    });
    html += '</div>';
  });

  container.innerHTML = html;
}

// ---- カテゴリ管理タブ ----
function renderCategoriesTab() {
  const container = document.getElementById('categories-content');
  const sorted = getSortedCategories();

  if (sorted.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📂</div><p>カテゴリがありません。</p></div>`;
    return;
  }

  let html = '<div class="data-table">';
  sorted.forEach(cat => {
    const usageCount = items.filter(i => i.categoryId === cat.id).length;
    html += `
      <div class="data-row" data-id="${cat.id}">
        <span class="data-row__sort">${cat.sortOrder}</span>
        <span class="data-row__name">${escapeHtml(cat.name)}</span>
        <span class="data-row__badge">${usageCount}件</span>
        <div class="data-row__actions">
          <button class="btn btn--icon btn--edit" onclick="handleEditCategory('${cat.id}')" title="編集">✏️</button>
          <button class="btn btn--icon btn--delete" onclick="handleDeleteCategory('${cat.id}')" title="削除">🗑️</button>
        </div>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

// ---- 商品管理タブ ----
function renderItemsTab() {
  const container = document.getElementById('items-content');
  const sorted = getSortedItems();
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  // 一括解除ボタン表示制御（ここで更新）
  const _clearBtn = document.getElementById('clear-buy-btn');
  if (_clearBtn) {
    _clearBtn.style.display = (sorted.length > 0 && sorted.some(i => i.buyThisTime)) ? '' : 'none';
  }

  if (sorted.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📦</div><p>商品がありません。</p></div>`;
    return;
  }

  let html = '<div class="data-table">';
  sorted.forEach(item => {
    const catName = item.categoryId && catMap[item.categoryId] ? catMap[item.categoryId].name : '―';
    const buyClass = item.buyThisTime ? 'buy-check--on' : '';
    html += `
      <div class="data-row" data-id="${item.id}">
        <span class="data-row__sort">${item.sortOrder}</span>
        <div class="data-row__main">
          <span class="data-row__name">${escapeHtml(item.name)}</span>
          <span class="data-row__sub">${escapeHtml(catName)}</span>
        </div>
        <label class="buy-check ${buyClass}" title="今回買う">
          <input type="checkbox" ${item.buyThisTime ? 'checked' : ''}
            onchange="handleToggleBuyThisTime('${item.id}', this.checked)">
          <span>今回買う</span>
        </label>
        <div class="data-row__actions">
          <button class="btn btn--icon btn--edit" onclick="handleEditItem('${item.id}')" title="編集">✏️</button>
          <button class="btn btn--icon btn--delete" onclick="handleDeleteItem('${item.id}')" title="削除">🗑️</button>
        </div>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderAll() {
  renderTabs();
  renderListTab();
  renderCategoriesTab();
  renderItemsTab();
}

// =============================================
// イベントハンドラ
// =============================================
function handleTabClick(tab) {
  activeTab = tab;
  renderAll();
}

// =============================================
// 一括登録
// =============================================
function openBulkAddModal() {
  document.getElementById('bulk-text').value = '';
  const preview = document.getElementById('bulk-preview');
  preview.style.display = 'none';
  preview.innerHTML = '';
  openModal('bulk-modal');
  document.getElementById('bulk-text').focus();
}

function parseBulkText(raw) {
  const lines = raw.split('\n');
  const catByName = {};
  categories.forEach(c => { catByName[c.name] = c; });

  const valid = [];
  const skipped = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return; // 空行はスキップ

    const parts = trimmed.split(',').map(s => s.trim());
    if (parts.length !== 3) {
      skipped.push({ lineNo: idx + 1, line: trimmed, reason: '項目数が3つではありません' });
      return;
    }

    const [name, catName, sortRaw] = parts;
    if (!name) {
      skipped.push({ lineNo: idx + 1, line: trimmed, reason: '商品名が空です' });
      return;
    }

    const sortOrder = Number(sortRaw);
    if (!sortRaw || isNaN(sortOrder) || !isFinite(sortOrder)) {
      skipped.push({ lineNo: idx + 1, line: trimmed, reason: 'ソート番号が数値ではありません' });
      return;
    }

    // カテゴリ解決（一致 → 紐づけ、不一致 → 未分類）
    const matchedCat = catByName[catName] || null;
    valid.push({ name, catName, resolvedCat: matchedCat, sortOrder });
  });

  return { valid, skipped };
}

function getOrCreateMiscCategory() {
  const MISC_NAME = '未分類';
  let misc = categories.find(c => c.name === MISC_NAME);
  if (!misc) {
    const maxSort = categories.reduce((m, c) => Math.max(m, c.sortOrder), 0);
    addCategory(MISC_NAME, maxSort + 10);
    misc = categories.find(c => c.name === MISC_NAME);
  }
  return misc;
}

function handleBulkAdd() {
  const raw = document.getElementById('bulk-text').value;
  const { valid, skipped } = parseBulkText(raw);

  if (valid.length === 0) {
    showToast('登録できる商品がありませんでした。', 'error');
    return;
  }

  // 未分類カテゴリが必要かチェック
  const needsMisc = valid.some(v => !v.resolvedCat);
  const miscCat = needsMisc ? getOrCreateMiscCategory() : null;

  valid.forEach(v => {
    const catId = v.resolvedCat ? v.resolvedCat.id : (miscCat ? miscCat.id : null);
    addItem(v.name, catId, v.sortOrder);
  });

  closeModal('bulk-modal');
  renderAll();

  let msg = `${valid.length}件を登録しました。`;
  if (skipped.length > 0) msg += `（${skipped.length}行スキップ）`;
  showToast(msg, 'success');

  // スキップ行がある場合は詳細をコンソールに出力
  if (skipped.length > 0) {
    console.info('[一括登録] スキップした行:', skipped);
  }
}


function handleEditCategory(id) {
  openEditCategoryModal(id);
}

function handleDeleteCategory(id) {
  showConfirm('このカテゴリを削除しますか？', () => {
    const ok = deleteCategory(id);
    if (ok) {
      showToast('カテゴリを削除しました。', 'success');
      renderAll();
    }
  });
}

function handleEditItem(id) {
  openEditItemModal(id);
}

function handleDeleteItem(id) {
  showConfirm('この商品を削除しますか？', () => {
    deleteItem(id);
    showToast('商品を削除しました。', 'success');
    renderAll();
  });
}

function handleToggleBuyThisTime(id, checked) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.buyThisTime = checked;
    if (!checked) item.purchased = false;
    saveData(STORAGE_KEYS.items, items);
    renderAll();
  }
}

function handleClearAllBuy() {
  const count = items.filter(i => i.buyThisTime).length;
  if (count === 0) return;
  showConfirm(`「今回買う」チェックを全て外しますか？（${count}件）`, () => {
    items.forEach(item => {
      item.buyThisTime = false;
      item.purchased = false;
    });
    saveData(STORAGE_KEYS.items, items);
    showToast('「今回買う」を全て解除しました。', 'success');
    renderAll();
  });
}

function handleTogglePurchased(id) {
  togglePurchased(id);
  renderAll();
}

// =============================================
// フォーム送信
// =============================================
function setupForms() {
  // カテゴリフォーム
  document.getElementById('cat-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const name = document.getElementById('cat-name').value.trim();
    const sortOrder = document.getElementById('cat-sort').value;
    if (!name) { showToast('カテゴリ名を入力してください。', 'error'); return; }

    if (form.dataset.mode === 'add') {
      addCategory(name, sortOrder);
      showToast('カテゴリを追加しました。', 'success');
    } else {
      updateCategory(form.dataset.editId, name, sortOrder);
      showToast('カテゴリを更新しました。', 'success');
    }
    closeModal('cat-modal');
    renderAll();
  });

  // 商品フォーム
  document.getElementById('item-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const name = document.getElementById('item-name').value.trim();
    const categoryId = document.getElementById('item-category').value;
    const sortOrder = document.getElementById('item-sort').value;
    if (!name) { showToast('商品名を入力してください。', 'error'); return; }

    if (form.dataset.mode === 'add') {
      addItem(name, categoryId, sortOrder);
      showToast('商品を追加しました。', 'success');
    } else {
      updateItem(form.dataset.editId, name, categoryId, sortOrder);
      showToast('商品を更新しました。', 'success');
    }
    closeModal('item-modal');
    renderAll();
  });
}

// =============================================
// モーダル外クリックで閉じる
// =============================================
function setupModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal(modal.id);
    });
  });
}

// =============================================
// ユーティリティ
// =============================================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// =============================================
// 初期化
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  setupForms();
  setupModals();
  renderAll();
});
