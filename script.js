const STORAGE_KEYS = {
  categories: "shoppingList_categories",
  items: "shoppingList_items",
};

const MESSAGES = {
  noCategory: "カテゴリなし",
};

let categories = loadData(STORAGE_KEYS.categories);
let items = loadData(STORAGE_KEYS.items);
let activeTab = "list";
let selectedCategoryIds = new Set();
let selectedItemIds = new Set();

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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function normalizeName(value) {
  return String(value).trim();
}

function isValidSortOrder(value) {
  if (value === "" || value === null || value === undefined) return false;
  return Number.isFinite(Number(value));
}

function getNextSortOrder(list) {
  return list.reduce((max, entry) => Math.max(max, Number(entry.sortOrder) || 0), 0) + 10;
}

function categoryExistsByName(name, excludeId = null) {
  return categories.some(category => {
    if (excludeId && category.id === excludeId) return false;
    return normalizeName(category.name) === normalizeName(name);
  });
}

function addCategory(name, sortOrder) {
  const normalizedName = normalizeName(name);
  if (!normalizedName || !isValidSortOrder(sortOrder) || categoryExistsByName(normalizedName)) {
    return false;
  }

  categories.push({
    id: generateId(),
    name: normalizedName,
    sortOrder: Number(sortOrder),
  });
  saveData(STORAGE_KEYS.categories, categories);
  return true;
}

function updateCategory(id, name, sortOrder) {
  const category = categories.find(entry => entry.id === id);
  const normalizedName = normalizeName(name);
  if (!category || !normalizedName || !isValidSortOrder(sortOrder)) {
    return { ok: false, reason: "invalid" };
  }
  if (categoryExistsByName(normalizedName, id)) {
    return { ok: false, reason: "duplicate" };
  }

  category.name = normalizedName;
  category.sortOrder = Number(sortOrder);
  saveData(STORAGE_KEYS.categories, categories);
  return { ok: true };
}

function deleteCategory(id) {
  if (items.some(item => item.categoryId === id)) {
    return false;
  }

  categories = categories.filter(category => category.id !== id);
  selectedCategoryIds.delete(id);
  saveData(STORAGE_KEYS.categories, categories);
  return true;
}

function deleteCategories(ids) {
  const skipped = [];
  const deletedIds = [];

  ids.forEach(id => {
    const category = categories.find(entry => entry.id === id);
    if (!category) return;
    if (items.some(item => item.categoryId === id)) {
      skipped.push(category.name);
      return;
    }
    deletedIds.push(id);
  });

  if (deletedIds.length > 0) {
    const deleteSet = new Set(deletedIds);
    categories = categories.filter(category => !deleteSet.has(category.id));
    deletedIds.forEach(id => selectedCategoryIds.delete(id));
    saveData(STORAGE_KEYS.categories, categories);
  }

  return { deletedCount: deletedIds.length, skipped };
}

function getSortedCategories() {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ja"));
}

function addItem(name, categoryId, sortOrder) {
  const normalizedName = normalizeName(name);
  if (!normalizedName || !isValidSortOrder(sortOrder)) {
    return false;
  }

  items.push({
    id: generateId(),
    name: normalizedName,
    categoryId: categoryId || null,
    sortOrder: Number(sortOrder),
    buyThisTime: false,
    purchased: false,
  });
  saveData(STORAGE_KEYS.items, items);
  return true;
}

function updateItem(id, name, categoryId, sortOrder) {
  const item = items.find(entry => entry.id === id);
  const normalizedName = normalizeName(name);
  if (!item || !normalizedName || !isValidSortOrder(sortOrder)) {
    return false;
  }

  item.name = normalizedName;
  item.categoryId = categoryId || null;
  item.sortOrder = Number(sortOrder);
  saveData(STORAGE_KEYS.items, items);
  return true;
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  selectedItemIds.delete(id);
  saveData(STORAGE_KEYS.items, items);
}

function deleteItems(ids) {
  if (ids.length === 0) return 0;

  const deleteSet = new Set(ids);
  items = items.filter(item => !deleteSet.has(item.id));
  ids.forEach(id => selectedItemIds.delete(id));
  saveData(STORAGE_KEYS.items, items);
  return ids.length;
}

function togglePurchased(id) {
  const item = items.find(entry => entry.id === id);
  if (!item || !item.buyThisTime) return;
  item.purchased = !item.purchased;
  saveData(STORAGE_KEYS.items, items);
}

function getCategoryMap() {
  return categories.reduce((map, category) => {
    map[category.id] = category;
    return map;
  }, {});
}

function getSortedItems() {
  const categoryMap = getCategoryMap();

  return [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    const sortA = categoryMap[a.categoryId] ? categoryMap[a.categoryId].sortOrder : Number.MAX_SAFE_INTEGER;
    const sortB = categoryMap[b.categoryId] ? categoryMap[b.categoryId].sortOrder : Number.MAX_SAFE_INTEGER;
    if (sortA !== sortB) {
      return sortA - sortB;
    }

    return a.name.localeCompare(b.name, "ja");
  });
}

function cleanupSelections() {
  const categoryIdSet = new Set(categories.map(category => category.id));
  const itemIdSet = new Set(items.map(item => item.id));
  selectedCategoryIds = new Set([...selectedCategoryIds].filter(id => categoryIdSet.has(id)));
  selectedItemIds = new Set([...selectedItemIds].filter(id => itemIdSet.has(id)));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast--show"));
  setTimeout(() => {
    toast.classList.remove("toast--show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 3000);
}

function showBulkResult(elementId, type, title, text) {
  const element = document.getElementById(elementId);
  element.className = `bulk-result bulk-result--${type}`;
  element.style.display = "block";
  element.innerHTML = `
    <div class="bulk-result__title">${escapeHtml(title)}</div>
    <div class="bulk-result__text">${escapeHtml(text)}</div>
  `;
}

function clearBulkResult(elementId) {
  const element = document.getElementById(elementId);
  element.className = "bulk-result";
  element.style.display = "none";
  element.innerHTML = "";
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add("modal--open");
  document.body.classList.add("body--modal-open");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("modal--open");
  document.body.classList.remove("body--modal-open");
}

function showConfirm(message, onOk, okLabel = "削除する") {
  document.getElementById("confirm-message").textContent = message;
  openModal("confirm-modal");

  const oldOk = document.getElementById("confirm-ok-btn");
  const oldCancel = document.getElementById("confirm-cancel-btn");
  const newOk = oldOk.cloneNode(true);
  const newCancel = oldCancel.cloneNode(true);

  newOk.textContent = okLabel;
  oldOk.replaceWith(newOk);
  oldCancel.replaceWith(newCancel);

  newOk.addEventListener("click", () => {
    closeModal("confirm-modal");
    onOk();
  });
  newCancel.addEventListener("click", () => closeModal("confirm-modal"));
}

function populateCategorySelect(selectId, selectedCategoryId) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">-- カテゴリなし --</option>';

  getSortedCategories().forEach(category => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    option.selected = category.id === selectedCategoryId;
    select.appendChild(option);
  });
}

function openAddCategoryModal() {
  const form = document.getElementById("cat-form");
  document.getElementById("cat-modal-title").textContent = "カテゴリを追加";
  form.dataset.mode = "add";
  delete form.dataset.editId;
  document.getElementById("cat-name").value = "";
  document.getElementById("cat-sort").value = getNextSortOrder(categories);
  openModal("cat-modal");
  document.getElementById("cat-name").focus();
}

function openEditCategoryModal(id) {
  const category = categories.find(entry => entry.id === id);
  if (!category) return;

  const form = document.getElementById("cat-form");
  document.getElementById("cat-modal-title").textContent = "カテゴリを編集";
  form.dataset.mode = "edit";
  form.dataset.editId = id;
  document.getElementById("cat-name").value = category.name;
  document.getElementById("cat-sort").value = category.sortOrder;
  openModal("cat-modal");
  document.getElementById("cat-name").focus();
}

function openAddItemModal() {
  const form = document.getElementById("item-form");
  document.getElementById("item-modal-title").textContent = "商品を追加";
  form.dataset.mode = "add";
  delete form.dataset.editId;
  document.getElementById("item-name").value = "";
  document.getElementById("item-sort").value = getNextSortOrder(items);
  populateCategorySelect("item-category", null);
  openModal("item-modal");
  document.getElementById("item-name").focus();
}

function openEditItemModal(id) {
  const item = items.find(entry => entry.id === id);
  if (!item) return;

  const form = document.getElementById("item-form");
  document.getElementById("item-modal-title").textContent = "商品を編集";
  form.dataset.mode = "edit";
  form.dataset.editId = id;
  document.getElementById("item-name").value = item.name;
  document.getElementById("item-sort").value = item.sortOrder;
  populateCategorySelect("item-category", item.categoryId);
  openModal("item-modal");
  document.getElementById("item-name").focus();
}

function renderTabs() {
  document.querySelectorAll(".tab-btn").forEach(button => {
    button.classList.toggle("tab-btn--active", button.dataset.tab === activeTab);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("tab-panel--active", panel.id === `panel-${activeTab}`);
  });
}

function renderListTab() {
  const container = document.getElementById("list-content");
  const buyItems = getSortedItems().filter(item => item.buyThisTime);
  const categoryMap = getCategoryMap();
  const uncategorizedKey = "__uncategorized__";

  if (buyItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🛒</div>
        <p>「今回買う」にチェックした商品がここに表示されます。</p>
      </div>
    `;
    return;
  }

  const grouped = {};
  buyItems.forEach(item => {
    const key = item.categoryId && categoryMap[item.categoryId] ? item.categoryId : uncategorizedKey;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const orderedKeys = [
    ...getSortedCategories().map(category => category.id).filter(id => grouped[id]),
    ...(grouped[uncategorizedKey] ? [uncategorizedKey] : []),
  ];

  let html = "";
  orderedKeys.forEach(key => {
    const categoryName = key === uncategorizedKey ? MESSAGES.noCategory : categoryMap[key].name;
    html += `<div class="category-group"><div class="category-group__header">${escapeHtml(categoryName)}</div>`;
    grouped[key].forEach(item => {
      html += `
        <div class="list-item ${item.purchased ? "list-item--purchased" : ""}" data-id="${item.id}">
          <button class="purchased-btn ${item.purchased ? "purchased-btn--done" : ""}" onclick="handleTogglePurchased('${item.id}')" title="購入済みを切り替え">
            ${item.purchased ? "✓" : ""}
          </button>
          <span class="list-item__name">${escapeHtml(item.name)}</span>
        </div>
      `;
    });
    html += "</div>";
  });

  container.innerHTML = html;
}

function renderCategoriesTab() {
  const container = document.getElementById("categories-content");
  const sortedCategories = getSortedCategories();

  if (sortedCategories.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📁</div>
        <p>カテゴリがまだ登録されていません。</p>
      </div>
    `;
    return;
  }

  const selectedCount = sortedCategories.filter(category => selectedCategoryIds.has(category.id)).length;
  let html = `
    <div class="bulk-toolbar">
      <div class="bulk-actions">
        <button type="button" class="btn btn--danger btn--sm" onclick="handleBulkDeleteCategories()" ${selectedCount === 0 ? "disabled" : ""}>
          選択したカテゴリを削除
        </button>
      </div>
      <div class="bulk-toolbar__count">${selectedCount}件選択中</div>
    </div>
    <div class="data-table">
  `;

  sortedCategories.forEach(category => {
    const usageCount = items.filter(item => item.categoryId === category.id).length;
    html += `
      <div class="data-row" data-id="${category.id}">
        <label class="row-select" aria-label="${escapeHtml(category.name)}を選択">
          <input type="checkbox" ${selectedCategoryIds.has(category.id) ? "checked" : ""} onchange="handleCategorySelectionChange('${category.id}', this.checked)" />
        </label>
        <span class="data-row__sort">${category.sortOrder}</span>
        <div class="data-row__main">
          <span class="data-row__name">${escapeHtml(category.name)}</span>
          <span class="data-row__sub">${usageCount}件の商品で使用中</span>
        </div>
        <div class="data-row__actions">
          <button class="btn btn--icon btn--edit" onclick="handleEditCategory('${category.id}')" title="編集">✏️</button>
          <button class="btn btn--icon btn--delete" onclick="handleDeleteCategory('${category.id}')" title="削除">🗑️</button>
        </div>
      </div>
    `;
  });

  html += "</div>";
  container.innerHTML = html;
}

function renderItemsTab() {
  const container = document.getElementById("items-content");
  const sortedItems = getSortedItems();
  const categoryMap = getCategoryMap();
  document.getElementById("clear-buy-btn").style.display = sortedItems.some(item => item.buyThisTime) ? "" : "none";

  if (sortedItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📦</div>
        <p>商品がまだ登録されていません。</p>
      </div>
    `;
    return;
  }

  const selectedCount = sortedItems.filter(item => selectedItemIds.has(item.id)).length;
  let html = `
    <div class="bulk-toolbar">
      <div class="bulk-actions">
        <button type="button" class="btn btn--danger btn--sm" onclick="handleBulkDeleteItems()" ${selectedCount === 0 ? "disabled" : ""}>
          選択した商品を削除
        </button>
      </div>
      <div class="bulk-toolbar__count">${selectedCount}件選択中</div>
    </div>
    <div class="data-table">
  `;

  sortedItems.forEach(item => {
    const categoryName = item.categoryId && categoryMap[item.categoryId] ? categoryMap[item.categoryId].name : MESSAGES.noCategory;
    html += `
      <div class="data-row" data-id="${item.id}">
        <label class="row-select" aria-label="${escapeHtml(item.name)}を選択">
          <input type="checkbox" ${selectedItemIds.has(item.id) ? "checked" : ""} onchange="handleItemSelectionChange('${item.id}', this.checked)" />
        </label>
        <span class="data-row__sort">${item.sortOrder}</span>
        <div class="data-row__main">
          <span class="data-row__name">${escapeHtml(item.name)}</span>
          <span class="data-row__sub">${escapeHtml(categoryName)}</span>
        </div>
        <label class="buy-check ${item.buyThisTime ? "buy-check--on" : ""}" title="今回買う">
          <input type="checkbox" ${item.buyThisTime ? "checked" : ""} onchange="handleToggleBuyThisTime('${item.id}', this.checked)" />
          <span>今回買う</span>
        </label>
        <div class="data-row__actions">
          <button class="btn btn--icon btn--edit" onclick="handleEditItem('${item.id}')" title="編集">✏️</button>
          <button class="btn btn--icon btn--delete" onclick="handleDeleteItem('${item.id}')" title="削除">🗑️</button>
        </div>
      </div>
    `;
  });

  html += "</div>";
  container.innerHTML = html;
}

function renderAll() {
  cleanupSelections();
  renderTabs();
  renderListTab();
  renderCategoriesTab();
  renderItemsTab();
}

function handleTabClick(tab) {
  activeTab = tab;
  renderAll();
}

function parseBulkItems(raw) {
  const categoryByName = categories.reduce((map, category) => {
    map[normalizeName(category.name)] = category;
    return map;
  }, {});

  const valid = [];
  const skipped = [];

  raw.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split(",").map(part => part.trim());
    if (parts.length !== 3) {
      skipped.push(`行${index + 1}: 入力形式が不正です`);
      return;
    }

    const [name, categoryName, sortRaw] = parts;
    if (!name) {
      skipped.push(`行${index + 1}: 商品名が空です`);
      return;
    }
    if (!isValidSortOrder(sortRaw)) {
      skipped.push(`行${index + 1}: ソート番号が数値ではありません`);
      return;
    }

    const matchedCategory = categoryByName[normalizeName(categoryName)] || null;
    valid.push({ name, categoryId: matchedCategory ? matchedCategory.id : null, sortOrder: Number(sortRaw) });
  });

  return { valid, skipped };
}

function parseBulkCategories(raw) {
  const existingNames = new Set(categories.map(category => normalizeName(category.name)));
  const pendingNames = new Set();
  const toCreate = [];
  const skipped = [];

  raw.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split(",").map(part => part.trim());
    if (parts.length !== 2) {
      skipped.push(`行${index + 1}: 入力形式が不正です`);
      return;
    }

    const [name, sortRaw] = parts;
    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      skipped.push(`行${index + 1}: カテゴリ名が空です`);
      return;
    }
    if (!isValidSortOrder(sortRaw)) {
      skipped.push(`行${index + 1}: ソート番号が数値ではありません`);
      return;
    }
    if (existingNames.has(normalizedName) || pendingNames.has(normalizedName)) {
      skipped.push(`行${index + 1}: 同名カテゴリは登録しません`);
      return;
    }

    pendingNames.add(normalizedName);
    toCreate.push({ name: normalizedName, sortOrder: Number(sortRaw) });
  });

  return { toCreate, skipped };
}

function openBulkAddModal() {
  document.getElementById("bulk-text").value = "";
  openModal("bulk-modal");
  document.getElementById("bulk-text").focus();
}

function openCategoryBulkModal() {
  document.getElementById("category-bulk-text").value = "";
  openModal("category-bulk-modal");
  document.getElementById("category-bulk-text").focus();
}

function closeCategoryBulkModal() {
  closeModal("category-bulk-modal");
}

function handleBulkAdd() {
  const { valid, skipped } = parseBulkItems(document.getElementById("bulk-text").value);
  if (valid.length === 0) {
    showToast("登録できる商品がありません。", "error");
    return;
  }

  valid.forEach(entry => addItem(entry.name, entry.categoryId, entry.sortOrder));
  closeModal("bulk-modal");
  renderAll();
  showToast(skipped.length > 0 ? `${valid.length}件登録しました。${skipped.length}件はスキップしました。` : `${valid.length}件登録しました。`, "success");
}

function handleBulkAddCategories() {
  clearBulkResult("category-bulk-result");
  const { toCreate, skipped } = parseBulkCategories(document.getElementById("category-bulk-text").value);

  if (toCreate.length === 0) {
    const text = skipped.length > 0 ? skipped.join(" / ") : "登録できるカテゴリがありません。";
    showBulkResult("category-bulk-result", "error", "登録できませんでした", text);
    showToast("登録できるカテゴリがありません。", "error");
    return;
  }

  toCreate.forEach(entry => addCategory(entry.name, entry.sortOrder));
  closeCategoryBulkModal();
  document.getElementById("category-bulk-text").value = "";
  renderAll();

  if (skipped.length > 0) {
    showBulkResult("category-bulk-result", "warning", `${toCreate.length}件登録しました`, `${skipped.length}件はスキップしました: ${skipped.join(" / ")}`);
  } else {
    showBulkResult("category-bulk-result", "success", `${toCreate.length}件登録しました`, "カテゴリ一覧に反映しました。");
  }

  showToast(`${toCreate.length}件のカテゴリを登録しました。`, "success");
}

function handleCategorySelectionChange(id, checked) {
  if (checked) {
    selectedCategoryIds.add(id);
  } else {
    selectedCategoryIds.delete(id);
  }
  renderCategoriesTab();
}

function handleItemSelectionChange(id, checked) {
  if (checked) {
    selectedItemIds.add(id);
  } else {
    selectedItemIds.delete(id);
  }
  renderItemsTab();
}

function handleEditCategory(id) {
  openEditCategoryModal(id);
}

function handleDeleteCategory(id) {
  showConfirm("このカテゴリを削除しますか？", () => {
    if (!deleteCategory(id)) {
      showToast("商品に使われているカテゴリは削除できません。", "error");
      return;
    }
    renderAll();
    showToast("カテゴリを削除しました。", "success");
  });
}

function handleBulkDeleteCategories() {
  const ids = [...selectedCategoryIds];
  if (ids.length === 0) return;

  showConfirm(`選択した${ids.length}件のカテゴリを削除しますか？`, () => {
    const result = deleteCategories(ids);
    renderAll();

    if (result.deletedCount > 0) {
      showToast(`${result.deletedCount}件のカテゴリを削除しました。`, "success");
    }
    if (result.skipped.length > 0) {
      showBulkResult("category-bulk-result", "warning", "削除できなかったカテゴリがあります", result.skipped.join("、"));
      showToast("使用中のカテゴリは削除できませんでした。", "error");
    } else {
      clearBulkResult("category-bulk-result");
    }
  });
}

function handleEditItem(id) {
  openEditItemModal(id);
}

function handleDeleteItem(id) {
  showConfirm("この商品を削除しますか？", () => {
    deleteItem(id);
    renderAll();
    showToast("商品を削除しました。", "success");
  });
}

function handleBulkDeleteItems() {
  const ids = [...selectedItemIds];
  if (ids.length === 0) return;

  showConfirm(`選択した${ids.length}件の商品を削除しますか？`, () => {
    const deletedCount = deleteItems(ids);
    renderAll();
    showToast(`${deletedCount}件の商品を削除しました。`, "success");
  });
}

function handleToggleBuyThisTime(id, checked) {
  const item = items.find(entry => entry.id === id);
  if (!item) return;
  item.buyThisTime = checked;
  if (!checked) item.purchased = false;
  saveData(STORAGE_KEYS.items, items);
  renderAll();
}

function handleTogglePurchased(id) {
  togglePurchased(id);
  renderAll();
}

function handleClearAllBuy() {
  const count = items.filter(item => item.buyThisTime).length;
  if (count === 0) return;

  showConfirm(`「今回買う」を${count}件すべて解除しますか？`, () => {
    items.forEach(item => {
      item.buyThisTime = false;
      item.purchased = false;
    });
    saveData(STORAGE_KEYS.items, items);
    renderAll();
    showToast("「今回買う」をすべて解除しました。", "success");
  }, "解除する");
}

function setupForms() {
  document.getElementById("cat-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.target;
    const name = document.getElementById("cat-name").value.trim();
    const sortOrder = document.getElementById("cat-sort").value.trim();

    if (!name) {
      showToast("カテゴリ名を入力してください。", "error");
      return;
    }
    if (!isValidSortOrder(sortOrder)) {
      showToast("ソート番号を正しく入力してください。", "error");
      return;
    }

    if (form.dataset.mode === "add") {
      if (!addCategory(name, sortOrder)) {
        showToast("同名カテゴリは登録できません。", "error");
        return;
      }
      showToast("カテゴリを追加しました。", "success");
    } else {
      const result = updateCategory(form.dataset.editId, name, sortOrder);
      if (!result.ok) {
        showToast(result.reason === "duplicate" ? "同名カテゴリは登録できません。" : "カテゴリを更新できませんでした。", "error");
        return;
      }
      showToast("カテゴリを更新しました。", "success");
    }

    closeModal("cat-modal");
    renderAll();
  });

  document.getElementById("item-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.target;
    const name = document.getElementById("item-name").value.trim();
    const categoryId = document.getElementById("item-category").value;
    const sortOrder = document.getElementById("item-sort").value.trim();

    if (!name) {
      showToast("商品名を入力してください。", "error");
      return;
    }
    if (!isValidSortOrder(sortOrder)) {
      showToast("ソート番号を正しく入力してください。", "error");
      return;
    }

    if (form.dataset.mode === "add") {
      if (!addItem(name, categoryId, sortOrder)) {
        showToast("商品を追加できませんでした。", "error");
        return;
      }
      showToast("商品を追加しました。", "success");
    } else {
      if (!updateItem(form.dataset.editId, name, categoryId, sortOrder)) {
        showToast("商品を更新できませんでした。", "error");
        return;
      }
      showToast("商品を更新しました。", "success");
    }

    closeModal("item-modal");
    renderAll();
  });
}

function setupModals() {
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupForms();
  setupModals();
  renderAll();
});
