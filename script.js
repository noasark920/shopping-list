const STORAGE_KEYS = {
  categories: "shoppingList_categories",
  items: "shoppingList_items",
};

const MESSAGES = {
  noCategory: "カテゴリなし",
};

let categories = loadData(STORAGE_KEYS.categories);
let items = normalizeItems(loadData(STORAGE_KEYS.items));
let activeTab = "list";
let appMenuOpen = false;
let shoppingMode = "shopping";
let shoppingModeHelpOpen = false;
let itemDeleteMode = false;
let selectedCategoryIds = new Set();
let beforeInstallPromptFired = false;

saveData(STORAGE_KEYS.items, items);
MESSAGES.noCategory = "カテゴリなし";

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

function saveItems() {
  saveData(STORAGE_KEYS.items, items);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function normalizeName(value) {
  return String(value ?? "").trim();
}

function isValidSortOrder(value) {
  if (value === "" || value === null || value === undefined) return false;
  return Number.isFinite(Number(value));
}

function getNextSortOrder(list) {
  return list.reduce((max, entry) => Math.max(max, Number(entry.sortOrder) || 0), 0) + 10;
}

function normalizeItem(item) {
  const selectedForShopping = Boolean(
    item.selectedForShopping !== undefined ? item.selectedForShopping : item.buyThisTime
  );

  return {
    id: item.id || generateId(),
    name: normalizeName(item.name),
    categoryId: item.categoryId || null,
    sortOrder: Number(item.sortOrder) || 0,
    selectedForShopping,
    purchased: selectedForShopping ? Boolean(item.purchased) : false,
  };
}

function normalizeItems(rawItems) {
  return Array.isArray(rawItems) ? rawItems.map(normalizeItem) : [];
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
    selectedForShopping: false,
    purchased: false,
  });
  saveItems();
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
  saveItems();
  return true;
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  selectedItemIds.delete(id);
  saveItems();
}

function deleteItems(ids) {
  if (ids.length === 0) return 0;

  const deleteSet = new Set(ids);
  items = items.filter(item => !deleteSet.has(item.id));
  ids.forEach(id => selectedItemIds.delete(id));
  saveItems();
  return ids.length;
}

function setItemShoppingSelection(id, checked) {
  const item = items.find(entry => entry.id === id);
  if (!item) return;

  item.selectedForShopping = checked;
  if (!checked) {
    item.purchased = false;
  }
  saveItems();
}

function togglePurchased(id) {
  const item = items.find(entry => entry.id === id);
  if (!item || !item.selectedForShopping) return;
  item.purchased = !item.purchased;
  saveItems();
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

function getRemainingShoppingCount(list = items) {
  return list.filter(item => item.selectedForShopping && !item.purchased).length;
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
  document.querySelectorAll(".app-menu__item").forEach(button => {
    button.classList.toggle("app-menu__item--active", button.dataset.tab === activeTab);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("tab-panel--active", panel.id === `panel-${activeTab}`);
  });
  const menuToggleButton = document.getElementById("menu-toggle-btn");
  const menuDropdown = document.getElementById("app-menu-dropdown");
  if (menuToggleButton) {
    menuToggleButton.setAttribute("aria-expanded", appMenuOpen ? "true" : "false");
  }
  if (menuDropdown) {
    menuDropdown.classList.toggle("app-menu__dropdown--open", appMenuOpen);
  }
}

function renderShoppingModePanel(remainingCount) {
  const descriptions = {
    select: "今回買う商品を選ぶモードです。ここでは対象商品のみ切り替えます。",
    shopping: "選択済みの商品だけを表示し、買ったものにチェックを付けます。",
  };

  return `
    <div class="mode-panel">
      <div class="mode-switch" role="tablist" aria-label="買い物リストモード切替">
        <button
          type="button"
          class="btn btn--ghost mode-switch__btn ${shoppingMode === "select" ? "mode-switch__btn--active" : ""}"
          onclick="handleShoppingModeChange('select')"
        >
          対象選択モード
        </button>
        <button
          type="button"
          class="btn btn--ghost mode-switch__btn ${shoppingMode === "shopping" ? "mode-switch__btn--active" : ""}"
          onclick="handleShoppingModeChange('shopping')"
        >
          買い物モード
        </button>
      </div>
      <div class="mode-panel__desc">${escapeHtml(descriptions[shoppingMode])}</div>
      <div class="list-summary">選択中: ${selectedCount}件</div>
    </div>
  `;
}

function renderShoppingModePanelCompact(selectedCount) {
  const descriptions = {
    select: "今回買う商品を選ぶモード",
    shopping: "選択した商品の購入状況をチェックするモード",
  };

  return `
    <div class="mode-panel mode-panel--list">
      <div class="mode-panel__top">
        <div class="mode-switch mode-switch--list" role="tablist" aria-label="買い物リストモード切替">
          <button
            type="button"
            class="btn btn--ghost mode-switch__btn mode-switch__btn--compact ${shoppingMode === "select" ? "mode-switch__btn--active" : ""}"
            onclick="handleShoppingModeChange('select')"
          >
            対象選択モード（${selectedCount}）
          </button>
          <button
            type="button"
            class="btn btn--ghost mode-switch__btn mode-switch__btn--compact ${shoppingMode === "shopping" ? "mode-switch__btn--active" : ""}"
            onclick="handleShoppingModeChange('shopping')"
          >
            買い物モード
          </button>
        </div>
        <div class="mode-help">
          <button
            type="button"
            class="mode-help__trigger"
            aria-label="モードの説明を表示"
            aria-expanded="${shoppingModeHelpOpen ? "true" : "false"}"
            onclick="toggleShoppingModeHelp(event)"
          >
            ?
          </button>
          <div class="mode-help__tooltip ${shoppingModeHelpOpen ? "mode-help__tooltip--open" : ""}" role="tooltip">
            <p class="mode-help__item"><strong>対象選択モード</strong><span>${escapeHtml(descriptions.select)}</span></p>
            <p class="mode-help__item"><strong>買い物モード</strong><span>${escapeHtml(descriptions.shopping)}</span></p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderListTab() {
  const container = document.getElementById("list-content");
  const sortedItems = getSortedItems();
  const categoryMap = getCategoryMap();
  const visibleItems = shoppingMode === "shopping"
    ? sortedItems.filter(item => item.selectedForShopping)
    : sortedItems;
  const selectedCount = sortedItems.filter(item => item.selectedForShopping).length;

  if (sortedItems.length === 0) {
    container.innerHTML = `
      ${renderShoppingModePanelCompact(0)}
      <div class="empty-state">
        <div class="empty-state__icon">🧾</div>
        <p>商品管理から商品を登録すると、買い物リストで選択できるようになります。</p>
      </div>
    `;
    return;
  }

  if (shoppingMode === "shopping" && visibleItems.length === 0) {
    container.innerHTML = `
      ${renderShoppingModePanelCompact(selectedCount)}
      <div class="empty-state">
        <div class="empty-state__icon">🛍️</div>
        <p>対象選択モードで今回買う商品を選んでください。</p>
      </div>
    `;
    return;
  }

  let html = `${renderShoppingModePanelCompact(selectedCount)}<div class="list-table list-table--compact">`;

  visibleItems.forEach(item => {
    const categoryName = item.categoryId && categoryMap[item.categoryId] ? categoryMap[item.categoryId].name : MESSAGES.noCategory;
    const checked = shoppingMode === "select" ? item.selectedForShopping : item.purchased;
    const changeHandler = shoppingMode === "select"
      ? `handleToggleShoppingSelection('${item.id}', this.checked)`
      : `handleTogglePurchased('${item.id}')`;

    html += `
      <label class="list-row ${shoppingMode === "shopping" && item.purchased ? "list-row--purchased" : ""}" data-id="${item.id}">
        <span class="list-row__check">
          <input
            type="checkbox"
            ${checked ? "checked" : ""}
            onchange="${changeHandler}"
          />
        </span>
        <span class="list-row__main">
          <span class="list-row__name">${escapeHtml(item.name)}</span>
          <span class="list-row__sub">${escapeHtml(categoryName)}</span>
        </span>
      </label>
    `;
  });

  html += "</div>";
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

function renderItemsToolbar(selectedCount) {
  if (!itemDeleteMode) {
    return "";
  }

  return `
    <div class="bulk-toolbar">
      <div class="bulk-actions">
        <button type="button" class="btn btn--danger btn--sm" onclick="handleBulkDeleteItems()" ${selectedCount === 0 ? "disabled" : ""}>
          選択した商品を削除
        </button>
        <button type="button" class="btn btn--ghost btn--sm" onclick="handleCancelItemDeleteMode()">
          キャンセル
        </button>
      </div>
      <div class="bulk-toolbar__count">${selectedCount}件選択中</div>
    </div>
  `;
}

function renderItemsTab() {
  const container = document.getElementById("items-content");
  const sortedItems = getSortedItems();
  const categoryMap = getCategoryMap();

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
  let html = `${renderItemsToolbar(selectedCount)}<div class="data-table">`;

  sortedItems.forEach(item => {
    const categoryName = item.categoryId && categoryMap[item.categoryId] ? categoryMap[item.categoryId].name : MESSAGES.noCategory;

    html += `
      <div class="data-row" data-id="${item.id}">
        ${itemDeleteMode ? `
          <label class="row-select" aria-label="${escapeHtml(item.name)}を選択">
            <input type="checkbox" ${selectedItemIds.has(item.id) ? "checked" : ""} onchange="handleItemSelectionChange('${item.id}', this.checked)" />
          </label>
        ` : ""}
        <span class="data-row__sort">${item.sortOrder}</span>
        <div class="data-row__main">
          <span class="data-row__name">${escapeHtml(item.name)}</span>
          <span class="data-row__sub">${escapeHtml(categoryName)}</span>
        </div>
        <div class="data-row__actions">
          <button class="btn btn--icon btn--edit" onclick="handleEditItem('${item.id}')" title="編集" ${itemDeleteMode ? "disabled" : ""}>✏️</button>
          <button class="btn btn--icon btn--delete" onclick="handleDeleteItem('${item.id}')" title="削除" ${itemDeleteMode ? "disabled" : ""}>🗑️</button>
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

function handleShoppingModeChange(mode) {
  shoppingMode = mode;
  shoppingModeHelpOpen = false;
  renderListTab();
}

function toggleShoppingModeHelp(event) {
  event.stopPropagation();
  shoppingModeHelpOpen = !shoppingModeHelpOpen;
  renderListTab();
}

function closeShoppingModeHelp() {
  if (!shoppingModeHelpOpen) return;
  shoppingModeHelpOpen = false;
  renderListTab();
}

function handleToggleItemDeleteMode() {
  itemDeleteMode = true;
  selectedItemIds.clear();
  renderItemsTab();
}

function handleCancelItemDeleteMode() {
  itemDeleteMode = false;
  selectedItemIds.clear();
  renderItemsTab();
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
      skipped.push(`行${index + 1}: 入力形式が正しくありません`);
      return;
    }

    const [name, categoryName, sortRaw] = parts;
    if (!name) {
      skipped.push(`行${index + 1}: 商品名が空です`);
      return;
    }
    if (!isValidSortOrder(sortRaw)) {
      skipped.push(`行${index + 1}: ソート順は数値で入力してください`);
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
      skipped.push(`行${index + 1}: 入力形式が正しくありません`);
      return;
    }

    const [name, sortRaw] = parts;
    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      skipped.push(`行${index + 1}: カテゴリ名が空です`);
      return;
    }
    if (!isValidSortOrder(sortRaw)) {
      skipped.push(`行${index + 1}: ソート順は数値で入力してください`);
      return;
    }
    if (existingNames.has(normalizedName) || pendingNames.has(normalizedName)) {
      skipped.push(`行${index + 1}: 同名カテゴリは登録できません`);
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
  showToast(
    skipped.length > 0
      ? `${valid.length}件登録しました。${skipped.length}件はスキップしました。`
      : `${valid.length}件登録しました。`,
    "success"
  );
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
      showToast("商品に使用中のカテゴリは削除できません。", "error");
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
      showBulkResult("category-bulk-result", "warning", "削除できなかったカテゴリがあります", result.skipped.join(" / "));
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
    itemDeleteMode = false;
    renderAll();
    showToast(`${deletedCount}件の商品を削除しました。`, "success");
  });
}

function handleToggleShoppingSelection(id, checked) {
  setItemShoppingSelection(id, checked);
  renderListTab();
}

function handleTogglePurchased(id) {
  togglePurchased(id);
  renderListTab();
}

function handleResetShoppingSelection() {
  showConfirm("選択中の商品をすべて解除しますか？", () => {
    items.forEach(item => {
      item.selectedForShopping = false;
      item.purchased = false;
    });
    saveItems();
    renderListTab();
    showToast("対象選択をすべて解除しました。", "success");
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
      showToast("ソート順を正しく入力してください。", "error");
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
      showToast("ソート順を正しく入力してください。", "error");
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

function setupShoppingModeHelp() {
  document.addEventListener("click", event => {
    const helpArea = document.querySelector(".mode-help");
    if (!shoppingModeHelpOpen || !helpArea) return;
    if (!helpArea.contains(event.target)) {
      closeShoppingModeHelp();
    }
  });
}

function renderTabs() {
  document.querySelectorAll(".app-menu__item").forEach(button => {
    button.classList.toggle("app-menu__item--active", button.dataset.tab === activeTab);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("tab-panel--active", panel.id === `panel-${activeTab}`);
  });

  const menuToggleButton = document.getElementById("menu-toggle-btn");
  const menuDropdown = document.getElementById("app-menu-dropdown");
  if (menuToggleButton) {
    menuToggleButton.setAttribute("aria-expanded", appMenuOpen ? "true" : "false");
  }
  if (menuDropdown) {
    menuDropdown.classList.toggle("app-menu__dropdown--open", appMenuOpen);
  }
}

function renderShoppingModePanelCompact(remainingCount) {
  const descriptions = {
    select: "今回の買い物対象を選ぶモード",
    shopping: "選択した商品の購入状況をチェックするモード",
  };

  const resetButton = shoppingMode === "select" ? `
      <div class="mode-actions">
        <button type="button" class="btn btn--ghost btn--sm mode-action-btn" onclick="handleResetShoppingSelection()">
          すべて解除
        </button>
      </div>
    ` : "";

  return `
    <div class="mode-panel mode-panel--list">
      <div class="mode-panel__top">
        <div class="mode-switch mode-switch--list" role="tablist" aria-label="買い物リストモード切替">
          <button
            type="button"
            class="btn btn--ghost mode-switch__btn mode-switch__btn--compact ${shoppingMode === "select" ? "mode-switch__btn--active" : ""}"
            onclick="handleShoppingModeChange('select')"
          >
            <span class="mode-switch__label">対象選択モード</span>
          </button>
          <button
            type="button"
            class="btn btn--ghost mode-switch__btn mode-switch__btn--compact ${shoppingMode === "shopping" ? "mode-switch__btn--active" : ""}"
            onclick="handleShoppingModeChange('shopping')"
          >
            <span class="mode-switch__label">買い物モード <span class="mode-switch__count">(${remainingCount})</span></span>
          </button>
        </div>
        <div class="mode-help">
          <button
            type="button"
            class="mode-help__trigger"
            aria-label="モードの説明を表示"
            aria-expanded="${shoppingModeHelpOpen ? "true" : "false"}"
            onclick="toggleShoppingModeHelp(event)"
          >
            ?
          </button>
          <div class="mode-help__tooltip ${shoppingModeHelpOpen ? "mode-help__tooltip--open" : ""}" role="tooltip">
            <p class="mode-help__item"><strong>対象選択モード</strong><span>${escapeHtml(descriptions.select)}</span></p>
            <p class="mode-help__item"><strong>買い物モード</strong><span>${escapeHtml(descriptions.shopping)}</span></p>
          </div>
        </div>
      </div>
      ${resetButton}
    </div>
  `;
}

function renderListTab() {
  const container = document.getElementById("list-content");
  const sortedItems = getSortedItems();
  const categoryMap = getCategoryMap();
  const visibleItems = shoppingMode === "shopping"
    ? sortedItems.filter(item => item.selectedForShopping)
    : sortedItems;
  const remainingCount = getRemainingShoppingCount(sortedItems);

  if (sortedItems.length === 0) {
    container.innerHTML = `
      ${renderShoppingModePanelCompact(0)}
      <div class="empty-state">
        <div class="empty-state__icon">🧾</div>
        <p>商品管理から商品を追加すると、買い物リストで対象選択できるようになります。</p>
      </div>
    `;
    return;
  }

  if (shoppingMode === "shopping" && visibleItems.length === 0) {
    container.innerHTML = `
      ${renderShoppingModePanelCompact(remainingCount)}
      <div class="empty-state">
        <div class="empty-state__icon">✅</div>
        <p>対象選択モードで今回買う商品を選んでください。</p>
      </div>
    `;
    return;
  }

  let html = `${renderShoppingModePanelCompact(remainingCount)}<div class="list-table list-table--compact">`;

  visibleItems.forEach(item => {
    const categoryName = item.categoryId && categoryMap[item.categoryId] ? categoryMap[item.categoryId].name : MESSAGES.noCategory;
    const checked = shoppingMode === "select" ? item.selectedForShopping : item.purchased;
    const changeHandler = shoppingMode === "select"
      ? `handleToggleShoppingSelection('${item.id}', this.checked)`
      : `handleTogglePurchased('${item.id}')`;

    html += `
      <label class="list-row ${shoppingMode === "shopping" && item.purchased ? "list-row--purchased" : ""}" data-id="${item.id}">
        <span class="list-row__check">
          <input
            type="checkbox"
            ${checked ? "checked" : ""}
            onchange="${changeHandler}"
          />
        </span>
        <span class="list-row__main">
          <span class="list-row__name">${escapeHtml(item.name)}</span>
          <span class="list-row__sub">${escapeHtml(categoryName)}</span>
        </span>
      </label>
    `;
  });

  html += "</div>";
  container.innerHTML = html;
}

function handleTabClick(tab) {
  activeTab = tab;
  appMenuOpen = false;
  renderAll();
}

function toggleAppMenu(event) {
  event.stopPropagation();
  appMenuOpen = !appMenuOpen;
  renderTabs();
}

function closeAppMenu() {
  if (!appMenuOpen) return;
  appMenuOpen = false;
  renderTabs();
}

function setupAppMenu() {
  document.addEventListener("click", event => {
    const menuArea = document.querySelector(".app-menu");
    if (!appMenuOpen || !menuArea) return;
    if (!menuArea.contains(event.target)) {
      closeAppMenu();
    }
  });
}

function isStandaloneMode() {
  const iosStandalone = window.navigator.standalone === true;
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches === true;
  return iosStandalone || displayStandalone;
}

function renderStandaloneDebug() {
  let debugNode = document.getElementById("standalone-debug");
  if (!debugNode) {
    debugNode = document.createElement("div");
    debugNode.id = "standalone-debug";
    debugNode.style.position = "fixed";
    debugNode.style.bottom = "10px";
    debugNode.style.right = "10px";
    debugNode.style.padding = "8px 12px";
    debugNode.style.background = "rgba(0, 0, 0, 0.75)";
    debugNode.style.color = "#fff";
    debugNode.style.fontSize = "0.7rem";
    debugNode.style.borderRadius = "12px";
    debugNode.style.zIndex = "9999";
    debugNode.style.pointerEvents = "none";
    debugNode.style.opacity = "0.9";
    debugNode.style.lineHeight = "1.4";
    document.body.appendChild(debugNode);
  }
  const standalone = isStandaloneMode() ? "yes" : "no";
  const swSupported = 'serviceWorker' in navigator ? "yes" : "no";
  const swController = navigator.serviceWorker?.controller ? "yes" : "no";
  const manifestFound = document.querySelector('link[rel="manifest"]') ? "yes" : "no";
  const bipFired = beforeInstallPromptFired ? "yes" : "no";
  debugNode.innerHTML = `
    standalone: ${standalone}<br>
    SW supported: ${swSupported}<br>
    SW controller: ${swController}<br>
    manifest: ${manifestFound}<br>
    BIP fired: ${bipFired}
  `;
  console.log('PWA Diagnostics:', { standalone, swSupported, swController, manifestFound, bipFired });
}

document.addEventListener("DOMContentLoaded", () => {
  setupForms();
  setupModals();
  setupShoppingModeHelp();
  setupAppMenu();
  window.addEventListener('beforeinstallprompt', () => {
    beforeInstallPromptFired = true;
    renderStandaloneDebug();
  });
  renderAll();
  renderStandaloneDebug();
});
