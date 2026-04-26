const STORAGE_KEYS = {
  categories: "shoppingList_categories",
  items: "shoppingList_items",
  settings: "shoppingList_settings",
  freeMemos: "shoppingList_freeMemos",
  selectionMemories: "shoppingSelectionMemories",
};

const APP_VERSION = "1.4.21";
const BACKUP_VERSION = "1.4.0";
const SHOPPING_TOGGLE_LOCK_MS = 500;
const MISSION_COUNTDOWN_DISPLAY_MS = 1100;
const SAMPLE_CATEGORY_NAMES = ["買い物", "持ち物", "タスク"];
const SAMPLE_ITEM_NAMES = [
  "バナナ",
  "りんご",
  "ブロッコリー",
  "トマト",
  "玉ねぎ",
  "にんじん",
  "きのこ",
  "鶏むね肉",
  "豚バラ肉",
  "魚",
  "卵",
  "牛乳",
  "豆腐",
  "納豆",
  "ヨーグルト",
  "味噌",
  "ポン酢",
  "麦茶",
  "洗濯洗剤",
  "トイレットペーパー",
];
const SAMPLE_ITEM_CATEGORY_NAME = "買い物";

const MESSAGES = {
  noCategory: "カテゴリなし",
};

let categories = loadData(STORAGE_KEYS.categories);
let items = normalizeItems(loadData(STORAGE_KEYS.items));
let settings = loadSettings();
let freeMemos = loadFreeMemos();
let activeTab = "list";
let appMenuOpen = false;
let shoppingMode = "shopping";
let preparationCategoryFilter = "all";
let shoppingModeHelpOpen = false;
let categoryLabelSettingHelpOpen = false;
let itemDeleteMode = false;
let categoryDeleteMode = false;
let selectedCategoryIds = new Set();
let selectedItemIds = new Set();
let selectionMemories = loadSelectionMemories();
let memoryPressTimer = null;
let memoryLongPressTriggered = false;
let pendingPurchasedUndo = null;
let pendingPurchasedUndoTimer = null;
let missionCompleteShown = false;
let missionCompleteVisible = false;
let missionCompleteTimers = [];
let missionRewardPattern = null;
let missionCountdownPatterns = null;
let missionCountdownTimer = null;
let shoppingToggleLockedUntil = 0;
let shoppingToggleLockTimer = null;
let pendingShoppingTapAnimation = null;
let sampleCategoryRegistrationInProgress = false;
let sampleItemRegistrationInProgress = false;

saveData(STORAGE_KEYS.items, items);
saveAppSettings();
saveFreeMemos();
saveSelectionMemories();
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

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEYS.settings);
  if (!raw) {
    return {
      showCategoryLabelsInShoppingList: false,
      movePurchasedToBottom: true,
      productListTwoColumn: true,
    };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        showCategoryLabelsInShoppingList: false,
        movePurchasedToBottom: true,
        productListTwoColumn: true,
      };
    }
    return {
      ...parsed,
      showCategoryLabelsInShoppingList: Boolean(parsed.showCategoryLabelsInShoppingList),
      movePurchasedToBottom: parsed.movePurchasedToBottom !== false,
      productListTwoColumn: parsed.productListTwoColumn !== false,
    };
  } catch {
    return {
      showCategoryLabelsInShoppingList: false,
      movePurchasedToBottom: true,
      productListTwoColumn: true,
    };
  }
}

function saveAppSettings() {
  if (Object.keys(settings).length > 0) {
    saveData(STORAGE_KEYS.settings, settings);
  } else {
    localStorage.removeItem(STORAGE_KEYS.settings);
  }
}

function loadFreeMemos() {
  const raw = localStorage.getItem(STORAGE_KEYS.freeMemos);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeFreeMemo) : [];
  } catch {
    return [];
  }
}

function saveFreeMemos() {
  saveData(STORAGE_KEYS.freeMemos, freeMemos);
}

function createEmptySelectionMemories() {
  return {
    1: { itemIds: [], memoIds: [], name: "" },
    2: { itemIds: [], memoIds: [], name: "" },
    3: { itemIds: [], memoIds: [], name: "" },
  };
}

function normalizeSelectionMemorySlot(slot) {
  return {
    itemIds: Array.isArray(slot?.itemIds) ? slot.itemIds.filter(id => typeof id === "string") : [],
    memoIds: Array.isArray(slot?.memoIds) ? slot.memoIds.filter(id => typeof id === "string") : [],
    name: typeof slot?.name === "string" ? slot.name.trim().slice(0, 20) : "",
  };
}

function normalizeSelectionMemories(raw) {
  const memories = createEmptySelectionMemories();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return memories;
  }

  ["1", "2", "3"].forEach(slot => {
    memories[slot] = normalizeSelectionMemorySlot(raw[slot]);
  });
  return memories;
}

function loadSelectionMemories() {
  const raw = localStorage.getItem(STORAGE_KEYS.selectionMemories);
  if (!raw) return createEmptySelectionMemories();
  try {
    return normalizeSelectionMemories(JSON.parse(raw));
  } catch {
    return createEmptySelectionMemories();
  }
}

function saveSelectionMemories() {
  saveData(STORAGE_KEYS.selectionMemories, selectionMemories);
}

function normalizeFreeMemo(memo) {
  return {
    id: memo.id || generateId(),
    text: String(memo.text ?? "").trim(),
    selectedForShopping: Boolean(memo.selectedForShopping),
    purchased: Boolean(memo.purchased),
    createdAt: memo.createdAt || new Date().toISOString(),
  };
}

function saveItems() {
  saveData(STORAGE_KEYS.items, items);
}

function buildBackupData() {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    categories,
    items,
    settings: Object.keys(settings).length > 0 ? settings : {},
    freeMemos,
    selectionMemories,
  };
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function handleExportBackup() {
  appMenuOpen = false;
  renderTabs();
  const filename = `shopping-list-backup-${new Date().toISOString().slice(0, 10)}.json`;
  downloadJson(filename, buildBackupData());
  showToast("バックアップをエクスポートしました。", "success");
}

function triggerImportBackup() {
  appMenuOpen = false;
  renderTabs();
  const input = document.getElementById("import-file-input");
  if (!input) return;
  input.value = "";
  input.click();
}

function handleImportFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch {
      showToast("バックアップファイルが正しいJSON形式ではありません。", "error");
      return;
    }

    const validationError = validateBackupData(parsed);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    showConfirm("現在のデータを上書きします。よろしいですか？", () => applyBackupData(parsed), "上書きする");
  };
  reader.readAsText(file, "UTF-8");
}

function validateBackupData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "バックアップデータが不正です。";
  }
  if (typeof data.version !== "string" || !data.version.trim()) {
    return "バックアップのバージョン情報が見つかりません。";
  }
  if (typeof data.exportedAt !== "string" || Number.isNaN(Date.parse(data.exportedAt))) {
    return "バックアップの日時情報が不正です。";
  }
  if (!Array.isArray(data.categories)) {
    return "バックアップにカテゴリデータが含まれていません。";
  }
  if (!Array.isArray(data.items)) {
    return "バックアップに商品データが含まれていません。";
  }
  if (data.settings !== undefined && (typeof data.settings !== "object" || Array.isArray(data.settings))) {
    return "バックアップの設定情報が不正です。";
  }
  if (data.freeMemos !== undefined && !Array.isArray(data.freeMemos)) {
    return "バックアップのフリーメモ情報が不正です。";
  }
  if (data.selectionMemories !== undefined) {
    if (typeof data.selectionMemories !== "object" || Array.isArray(data.selectionMemories)) {
      return "バックアップの準備モード用メモリ情報が不正です。";
    }
    const invalidMemory = ["1", "2", "3"].some(slot => {
      const memory = data.selectionMemories[slot];
      return memory !== undefined &&
        (!memory || typeof memory !== "object" || Array.isArray(memory) ||
          (memory.itemIds !== undefined && !Array.isArray(memory.itemIds)) ||
          (memory.memoIds !== undefined && !Array.isArray(memory.memoIds)) ||
          (memory.name !== undefined && typeof memory.name !== "string"));
    });
    if (invalidMemory) {
      return "バックアップの準備モード用メモリ情報が不正です。";
    }
  }

  const invalidCategory = data.categories.some(category => {
    return !category || typeof category !== "object" || !category.id || typeof category.name !== "string" || category.name.trim() === "" || !isValidSortOrder(category.sortOrder);
  });
  if (invalidCategory) {
    return "バックアップのカテゴリデータに不正な項目があります。";
  }

  const invalidItem = data.items.some(item => {
    return !item || typeof item !== "object" || typeof item.name !== "string" || item.name.trim() === "";
  });
  if (invalidItem) {
    return "バックアップの商品データに不正な項目があります。";
  }

  if (data.freeMemos) {
    const invalidMemo = data.freeMemos.some(memo => {
      return !memo || typeof memo !== "object" || typeof memo.text !== "string" || memo.text.trim() === "";
    });
    if (invalidMemo) {
      return "バックアップのフリーメモデータに不正な項目があります。";
    }
  }

  return null;
}

function applyBackupData(backup) {
  categories = backup.categories.map(category => ({
    id: category.id || generateId(),
    name: normalizeName(category.name),
    sortOrder: Number(category.sortOrder) || 0,
  }));

  items = normalizeItems(backup.items);

  settings = backup.settings && typeof backup.settings === "object" && !Array.isArray(backup.settings)
    ? {
      ...backup.settings,
      showCategoryLabelsInShoppingList: Boolean(backup.settings.showCategoryLabelsInShoppingList),
      movePurchasedToBottom: backup.settings.movePurchasedToBottom !== false,
      productListTwoColumn: backup.settings.productListTwoColumn !== false,
    }
    : { showCategoryLabelsInShoppingList: false, movePurchasedToBottom: true, productListTwoColumn: true };

  freeMemos = backup.freeMemos ? backup.freeMemos.map(normalizeFreeMemo) : [];
  selectionMemories = normalizeSelectionMemories(backup.selectionMemories);

  saveData(STORAGE_KEYS.categories, categories);
  saveItems();
  saveAppSettings();
  saveFreeMemos();
  saveSelectionMemories();

  selectedCategoryIds.clear();
  selectedItemIds.clear();
  shoppingMode = "shopping";

  renderAll();
  showToast("バックアップをインポートしました。", "success");
}

function handleDragStart(event, id) {
  event.dataTransfer.setData("text/plain", id);
  event.dataTransfer.effectAllowed = "move";
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleDrop(event, type) {
  event.preventDefault();
  const draggedId = event.dataTransfer.getData("text/plain");
  const targetRow = event.target.closest(".data-row");
  if (!targetRow) return;
  const targetId = targetRow.dataset.id;

  if (draggedId === targetId) return;

  if (type === "category") {
    reorderCategories(draggedId, targetId);
  } else if (type === "item") {
    reorderItems(draggedId, targetId);
  }
}

function reorderCategories(draggedId, targetId) {
  const draggedIndex = categories.findIndex(cat => cat.id === draggedId);
  const targetIndex = categories.findIndex(cat => cat.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) return;

  const [dragged] = categories.splice(draggedIndex, 1);
  categories.splice(targetIndex, 0, dragged);

  renumberSortOrder(categories);
  saveData(STORAGE_KEYS.categories, categories);
  renderCategoriesTab();
}

function reorderItems(draggedId, targetId) {
  const draggedIndex = items.findIndex(item => item.id === draggedId);
  const targetIndex = items.findIndex(item => item.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) return;

  const [dragged] = items.splice(draggedIndex, 1);
  items.splice(targetIndex, 0, dragged);

  renumberSortOrder(items);
  saveItems();
  renderItemsTab();
}

function renumberSortOrder(list) {
  list.forEach((item, index) => {
    item.sortOrder = (index + 1) * 10;
  });
}

function addFreeMemo(text) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 100) return false;

  freeMemos.push({
    id: generateId(),
    text: trimmed,
    selectedForShopping: false,
    purchased: false,
    createdAt: new Date().toISOString(),
  });
  saveFreeMemos();
  return true;
}

function updateFreeMemo(id, text) {
  const memo = freeMemos.find(m => m.id === id);
  if (!memo) return false;
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 100) return false;
  memo.text = trimmed;
  saveFreeMemos();
  return true;
}

function deleteFreeMemo(id) {
  freeMemos = freeMemos.filter(m => m.id !== id);
  saveFreeMemos();
}

function toggleFreeMemoSelection(id) {
  const memo = freeMemos.find(m => m.id === id);
  if (!memo) return;
  memo.selectedForShopping = !memo.selectedForShopping;
  if (!memo.selectedForShopping) {
    memo.purchased = false;
  }
  saveFreeMemos();
}

function toggleFreeMemoPurchased(id) {
  const memo = freeMemos.find(m => m.id === id);
  if (!memo || !memo.selectedForShopping) return;
  memo.purchased = !memo.purchased;
  saveFreeMemos();
}

function getSelectionMemoryLabel(slot) {
  return String(slot);
}

function getSelectionMemoryDisplayName(slot) {
  const name = selectionMemories[slot]?.name;
  return name ? name : getSelectionMemoryLabel(slot);
}

function getFirstVisibleCharacter(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
    const firstSegment = segmenter.segment(text)[Symbol.iterator]().next().value;
    return firstSegment ? firstSegment.segment : "";
  }
  return Array.from(text)[0] || "";
}

function getSelectionMemoryButtonLabel(slot) {
  const name = selectionMemories[slot]?.name;
  return name ? getFirstVisibleCharacter(name) : getSelectionMemoryLabel(slot);
}

function isSelectionMemoryEmpty(slot) {
  const memory = selectionMemories[slot];
  return !memory || (memory.itemIds.length === 0 && memory.memoIds.length === 0);
}

function saveCurrentSelectionToMemory(slot, nameInput = "") {
  const currentName = selectionMemories[slot]?.name || "";
  const nextName = nameInput.trim() || currentName;
  selectionMemories[slot] = {
    itemIds: items.filter(item => item.selectedForShopping).map(item => item.id),
    memoIds: freeMemos.filter(memo => memo.selectedForShopping).map(memo => memo.id),
    name: nextName.slice(0, 20),
  };
  saveSelectionMemories();
}

function restoreSelectionMemory(slot) {
  const memory = selectionMemories[slot];
  if (!memory || isSelectionMemoryEmpty(slot)) {
    showMessage(`メモリ${getSelectionMemoryLabel(slot)}は未登録です`);
    return;
  }

  const itemIdSet = new Set(memory.itemIds);
  const memoIdSet = new Set(memory.memoIds);

  items.forEach(item => {
    item.selectedForShopping = itemIdSet.has(item.id);
    item.purchased = false;
  });

  freeMemos.forEach(memo => {
    memo.selectedForShopping = memoIdSet.has(memo.id);
    memo.purchased = false;
  });

  saveItems();
  saveFreeMemos();
  resetMissionCompleteEligibility();
  renderListTab();
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

function getCategoryByName(name) {
  const normalizedName = normalizeName(name);
  return categories.find(category => normalizeName(category.name) === normalizedName) || null;
}

function ensureCategoryByName(name) {
  const existing = getCategoryByName(name);
  if (existing) return existing;

  addCategory(name, getNextSortOrder(categories));
  return getCategoryByName(name);
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

function normalizePreparationCategoryFilter() {
  if (preparationCategoryFilter === "all" || preparationCategoryFilter === "uncategorized") {
    return;
  }
  if (!categories.some(category => category.id === preparationCategoryFilter)) {
    preparationCategoryFilter = "all";
  }
}

function getFilteredPreparationItems(list = getSortedItems()) {
  normalizePreparationCategoryFilter();
  if (preparationCategoryFilter === "all") {
    return list;
  }
  if (preparationCategoryFilter === "uncategorized") {
    return list.filter(item => !item.categoryId);
  }
  return list.filter(item => item.categoryId === preparationCategoryFilter);
}

function resetPreparationCategoryFilter() {
  preparationCategoryFilter = "all";
}

function getRemainingShoppingCount(list = items) {
  return list.filter(item => item.selectedForShopping && !item.purchased).length;
}

function getPurchasedLastEntries(entries) {
  if (shoppingMode !== "shopping" || !settings.movePurchasedToBottom) {
    return entries;
  }
  return [
    ...entries.filter(entry => !entry.purchased),
    ...entries.filter(entry => entry.purchased),
  ];
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

function getPurchasedUndoElement() {
  let element = document.getElementById("purchased-undo");
  if (!element) {
    element = document.createElement("div");
    element.id = "purchased-undo";
    element.className = "purchased-undo";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    document.body.appendChild(element);
  }
  return element;
}

function hidePurchasedUndo() {
  const element = document.getElementById("purchased-undo");
  if (element) {
    element.classList.remove("purchased-undo--show");
  }
  document.body.classList.remove("body--purchased-undo-visible");
}

function clearPurchasedUndo() {
  if (pendingPurchasedUndoTimer) {
    clearTimeout(pendingPurchasedUndoTimer);
    pendingPurchasedUndoTimer = null;
  }
  pendingPurchasedUndo = null;
  hidePurchasedUndo();
}

function showPurchasedUndo(action) {
  if (pendingPurchasedUndoTimer) {
    clearTimeout(pendingPurchasedUndoTimer);
  }

  pendingPurchasedUndo = action;
  const element = getPurchasedUndoElement();
  element.innerHTML = `
    <span class="purchased-undo__message">チェック状態を変更</span>
    <button type="button" class="purchased-undo__action" onclick="handleUndoPurchasedToggle()">元に戻す</button>
  `;
  requestAnimationFrame(() => {
    document.body.classList.add("body--purchased-undo-visible");
    element.classList.add("purchased-undo--show");
  });

  pendingPurchasedUndoTimer = setTimeout(() => {
    clearPurchasedUndo();
  }, 4000);
}

function handleUndoPurchasedToggle() {
  if (!pendingPurchasedUndo) return;

  const undo = pendingPurchasedUndo;
  clearPurchasedUndo();

  if (undo.type === "item") {
    const item = items.find(entry => entry.id === undo.id);
    if (!item) return;
    item.purchased = undo.previousPurchased;
    saveItems();
  } else if (undo.type === "memo") {
    const memo = freeMemos.find(entry => entry.id === undo.id);
    if (!memo) return;
    memo.purchased = undo.previousPurchased;
    saveFreeMemos();
  }

  renderListTab();
  if (undo.previousPurchased) {
    evaluateMissionComplete();
  } else {
    resetMissionCompleteEligibility();
  }
}

function getShoppingCompletionState() {
  const selectedItems = items.filter(item => item.selectedForShopping);
  const selectedMemos = freeMemos.filter(memo => memo.selectedForShopping);
  const totalSelected = selectedItems.length + selectedMemos.length;
  const remainingUnchecked =
    selectedItems.filter(item => !item.purchased).length +
    selectedMemos.filter(memo => !memo.purchased).length;
  const completed =
    totalSelected > 0 &&
    selectedItems.every(item => item.purchased) &&
    selectedMemos.every(memo => memo.purchased);
  const allUnchecked =
    totalSelected > 0 &&
    remainingUnchecked === totalSelected;

  return { totalSelected, remainingUnchecked, completed, allUnchecked };
}

function resetMissionRewardIfAllUnchecked() {
  const state = getShoppingCompletionState();
  if (state.totalSelected === 0 || state.allUnchecked) {
    missionRewardPattern = null;
    missionCountdownPatterns = null;
    hideMissionCountdownEffect();
  }
}

function resetMissionCompleteEligibility() {
  missionCompleteShown = false;
  resetMissionRewardIfAllUnchecked();
  if (!getShoppingCompletionState().completed) {
    hideMissionCompletePopup();
  }
}

function evaluateMissionComplete() {
  if (shoppingMode !== "shopping") return;

  const state = getShoppingCompletionState();
  if (!state.completed) {
    missionCompleteShown = false;
    hideMissionCompletePopup();
    return;
  }

  if (!missionCompleteShown) {
    showMissionCompletePopup();
  }
}

function getMissionCompleteElement() {
  let element = document.getElementById("mission-complete-popup");
  if (!element) {
    element = document.createElement("div");
    element.id = "mission-complete-popup";
    element.className = "mission-complete-popup";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    element.innerHTML = `
      <div class="mission-complete-popup__card" aria-label="Mission complete">
        <img src="./complete_n.webp" alt="Mission complete" class="mission-complete-popup__image" />
      </div>
      <button type="button" class="mission-complete-popup__close" onclick="hideMissionCompletePopup()">
        閉じる
      </button>
    `;
    document.body.appendChild(element);
  }
  return element;
}

function clearMissionCompleteTimers() {
  missionCompleteTimers.forEach(timerId => clearTimeout(timerId));
  missionCompleteTimers = [];
}

function setMissionCompleteImage(src) {
  const element = getMissionCompleteElement();
  const image = element.querySelector(".mission-complete-popup__image");
  if (image) {
    image.src = src;
  }
}

function setMissionCompleteCloseVisible(visible) {
  const element = getMissionCompleteElement();
  const closeButton = element.querySelector(".mission-complete-popup__close");
  if (closeButton) {
    closeButton.classList.toggle("mission-complete-popup__close--show", visible);
  }
}

function scheduleMissionCompleteStep(callback, delay) {
  const timerId = setTimeout(() => {
    missionCompleteTimers = missionCompleteTimers.filter(id => id !== timerId);
    if (!missionCompleteVisible) return;
    callback();
  }, delay);
  missionCompleteTimers.push(timerId);
}

function getNormalMissionCompleteRewardPattern() {
  return {
    rarity: "normal",
    initialImage: "./complete_n.webp",
    steps: [{ delay: 3000, action: hideMissionCompletePopup }],
  };
}

function getMissionCompleteRewardPattern() {
  const { totalSelected } = getShoppingCompletionState();
  if (totalSelected <= 3) {
    return getNormalMissionCompleteRewardPattern();
  }

  const rand = Math.random();
  if (rand < 0.75) {
    return getNormalMissionCompleteRewardPattern();
  }
  if (rand < 0.95) {
    return {
      rarity: "rare",
      initialImage: "./complete_n.webp",
      steps: [
        { delay: 1200, action: () => setMissionCompleteImage("./complete_r.webp") },
        { delay: 3400, action: hideMissionCompletePopup },
      ],
    };
  }
  return {
    rarity: "superRare",
    initialImage: "./complete_n.webp",
    steps: [
      { delay: 1200, action: () => setMissionCompleteImage("./complete_sr.webp") },
      { delay: 4000, action: hideMissionCompletePopup },
    ],
  };
}

function drawCountdownRarityForReward(rewardRarity) {
  const rand = Math.random();
  if (rewardRarity === "rare") {
    if (rand < 0.60) return "normal";
    if (rand < 0.95) return "rare";
    return "superRare";
  }
  if (rewardRarity === "superRare") {
    if (rand < 0.45) return "normal";
    if (rand < 0.80) return "rare";
    return "superRare";
  }
  if (rand < 0.94) return "normal";
  if (rand < 0.99) return "rare";
  return "superRare";
}

function drawUpgradedCountdownRarity() {
  return Math.random() < 0.85 ? "rare" : "superRare";
}

function getMissionCountdownImage(rarity, remainingNumber) {
  const prefix = {
    normal: "n",
    rare: "r",
    superRare: "sr",
  }[rarity] || "n";
  return `./countdown_${prefix}${remainingNumber}.png`;
}

function getMissionCountdownPatterns(rewardRarity) {
  const { totalSelected } = getShoppingCompletionState();
  if (totalSelected <= 3) return null;

  const patterns = {};
  let minimumRarity = "normal";
  [3, 2, 1].forEach(remainingNumber => {
    let rarity;
    if (minimumRarity === "superRare") {
      rarity = "superRare";
    } else if (minimumRarity === "rare") {
      rarity = drawUpgradedCountdownRarity();
    } else {
      rarity = drawCountdownRarityForReward(rewardRarity);
    }

    if (rarity === "superRare") {
      minimumRarity = "superRare";
    } else if (rarity === "rare") {
      minimumRarity = "rare";
    }

    patterns[remainingNumber] = {
      rarity,
      image: getMissionCountdownImage(rarity, remainingNumber),
    };
  });
  return patterns;
}

function prepareMissionRewardForShoppingStart() {
  if (shoppingMode !== "shopping" || missionRewardPattern) return;
  missionRewardPattern = getMissionCompleteRewardPattern();
  missionCountdownPatterns = getMissionCountdownPatterns(missionRewardPattern.rarity);
}

function getMissionCountdownElement() {
  let element = document.getElementById("mission-countdown-effect");
  if (!element) {
    element = document.createElement("div");
    element.id = "mission-countdown-effect";
    element.className = "mission-countdown-effect";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    element.innerHTML = `
      <img src="./countdown_n3.png" alt="" class="mission-countdown-effect__image" />
    `;
    document.body.appendChild(element);
  }
  return element;
}

function hideMissionCountdownEffect() {
  if (missionCountdownTimer) {
    clearTimeout(missionCountdownTimer);
    missionCountdownTimer = null;
  }
  const element = document.getElementById("mission-countdown-effect");
  if (element) {
    element.classList.remove("mission-countdown-effect--show");
  }
}

function showMissionCountdownEffect(remainingNumber) {
  if (shoppingMode !== "shopping") return;
  const { totalSelected } = getShoppingCompletionState();
  if (totalSelected <= 3 || ![1, 2, 3].includes(remainingNumber)) return;

  if (!missionCountdownPatterns && missionRewardPattern) {
    missionCountdownPatterns = getMissionCountdownPatterns(missionRewardPattern.rarity);
  }

  const pattern = missionCountdownPatterns?.[remainingNumber];
  if (!pattern) return;

  const element = getMissionCountdownElement();
  const image = element.querySelector(".mission-countdown-effect__image");
  if (image) {
    image.src = pattern.image;
  }

  if (missionCountdownTimer) {
    clearTimeout(missionCountdownTimer);
  }
  element.classList.remove("mission-countdown-effect--show");
  requestAnimationFrame(() => {
    element.classList.add("mission-countdown-effect--show");
  });
  missionCountdownTimer = setTimeout(() => {
    missionCountdownTimer = null;
    element.classList.remove("mission-countdown-effect--show");
  }, MISSION_COUNTDOWN_DISPLAY_MS);
}

function showMissionCompletePopup() {
  clearMissionCompleteTimers();

  missionCompleteShown = true;
  missionCompleteVisible = true;
  if (!missionRewardPattern) {
    missionRewardPattern = getMissionCompleteRewardPattern();
  }
  if (!missionCountdownPatterns) {
    missionCountdownPatterns = getMissionCountdownPatterns(missionRewardPattern.rarity);
  }
  const rewardPattern = missionRewardPattern;
  const element = getMissionCompleteElement();
  setMissionCompleteImage(rewardPattern.initialImage);
  setMissionCompleteCloseVisible(false);
  requestAnimationFrame(() => element.classList.add("mission-complete-popup--show"));

  scheduleMissionCompleteStep(() => setMissionCompleteCloseVisible(true), 1200);
  rewardPattern.steps.forEach(step => {
    scheduleMissionCompleteStep(step.action, step.delay);
  });
}

function hideMissionCompletePopup() {
  clearMissionCompleteTimers();

  missionCompleteVisible = false;
  const element = document.getElementById("mission-complete-popup");
  if (element) {
    element.classList.remove("mission-complete-popup--show");
    setMissionCompleteCloseVisible(false);
  }
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

function setConfirmMessage(message, extraHtml = "") {
  const messageElement = document.getElementById("confirm-message");
  messageElement.innerHTML = `${escapeHtml(message)}${extraHtml}`;
}

function showConfirm(message, onOk, okLabel = "削除する", okClass = "btn btn--danger", options = {}) {
  setConfirmMessage(message, options.extraHtml || "");
  openModal("confirm-modal");

  const oldOk = document.getElementById("confirm-ok-btn");
  const oldCancel = document.getElementById("confirm-cancel-btn");
  const newOk = oldOk.cloneNode(true);
  const newCancel = oldCancel.cloneNode(true);

  newOk.textContent = okLabel;
  newOk.className = okClass;
  newCancel.style.display = "";
  oldOk.replaceWith(newOk);
  oldCancel.replaceWith(newCancel);

  newOk.addEventListener("click", () => {
    closeModal("confirm-modal");
    onOk();
  });
  newCancel.addEventListener("click", () => closeModal("confirm-modal"));
}

function showMessage(message, okLabel = "OK") {
  setConfirmMessage(message);
  openModal("confirm-modal");

  const oldOk = document.getElementById("confirm-ok-btn");
  const oldCancel = document.getElementById("confirm-cancel-btn");
  const newOk = oldOk.cloneNode(true);
  const newCancel = oldCancel.cloneNode(true);

  newOk.textContent = okLabel;
  newOk.className = "btn btn--primary";
  newCancel.style.display = "none";
  oldOk.replaceWith(newOk);
  oldCancel.replaceWith(newCancel);

  newOk.addEventListener("click", () => closeModal("confirm-modal"));
}

function showMemoryRegistrationConfirm(slot) {
  const label = getSelectionMemoryLabel(slot);
  const currentName = selectionMemories[slot]?.name || "";
  showConfirm(`現在の対象選択状態をメモリ${label}に登録しますか？`, () => {
    const input = document.getElementById("memory-name-input");
    saveCurrentSelectionToMemory(slot, input ? input.value : "");
    showMessage(`メモリ${label}に登録しました`);
    renderListTab();
  }, "登録する", "btn btn--primary", {
    extraHtml: `
      <input
        id="memory-name-input"
        class="memory-name-input"
        type="text"
        maxlength="20"
        value="${escapeHtml(currentName)}"
        placeholder="メモリ名を入力（例：毎日用）"
      />
    `,
  });

  const input = document.getElementById("memory-name-input");
  if (input) {
    input.focus();
  }
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
  openModal("cat-modal");
  document.getElementById("cat-name").focus();
}

function openAddItemModal() {
  const form = document.getElementById("item-form");
  document.getElementById("item-modal-title").textContent = "項目を追加";
  form.dataset.mode = "add";
  delete form.dataset.editId;
  document.getElementById("item-name").value = "";
  populateCategorySelect("item-category", null);
  openModal("item-modal");
  document.getElementById("item-name").focus();
}

function openEditItemModal(id) {
  const item = items.find(entry => entry.id === id);
  if (!item) return;

  const form = document.getElementById("item-form");
  document.getElementById("item-modal-title").textContent = "項目を編集";
  form.dataset.mode = "edit";
  form.dataset.editId = id;
  document.getElementById("item-name").value = item.name;
  populateCategorySelect("item-category", item.categoryId);
  openModal("item-modal");
  document.getElementById("item-name").focus();
}

function renderSampleCategoryButton() {
  return `
    <button type="button" class="btn btn--primary empty-state__action" onclick="handleRegisterSampleCategories(this)">
      おすすめカテゴリを登録する
    </button>
  `;
}

function renderSampleItemButton() {
  return `
    <button type="button" class="btn btn--primary empty-state__action" onclick="handleRegisterSampleItems(this)">
      サンプル項目を登録する
    </button>
  `;
}

function handleRegisterSampleCategories(button) {
  if (sampleCategoryRegistrationInProgress || categories.length > 0) return;
  sampleCategoryRegistrationInProgress = true;
  if (button) button.disabled = true;

  let nextSortOrder = getNextSortOrder(categories);
  SAMPLE_CATEGORY_NAMES.forEach(name => {
    if (!categoryExistsByName(name)) {
      addCategory(name, nextSortOrder);
      nextSortOrder += 10;
    }
  });

  sampleCategoryRegistrationInProgress = false;
  renderAll();
  showToast("3件のカテゴリを登録しました", "success");
}

function handleRegisterSampleItems(button) {
  if (sampleItemRegistrationInProgress || items.length > 0) return;
  sampleItemRegistrationInProgress = true;
  if (button) button.disabled = true;

  const category = ensureCategoryByName(SAMPLE_ITEM_CATEGORY_NAME);
  if (!category) {
    sampleItemRegistrationInProgress = false;
    if (button) button.disabled = false;
    showToast("サンプル項目を登録できませんでした。", "error");
    return;
  }

  let nextSortOrder = getNextSortOrder(items);
  SAMPLE_ITEM_NAMES.forEach(name => {
    addItem(name, category.id, nextSortOrder);
    nextSortOrder += 10;
  });

  sampleItemRegistrationInProgress = false;
  renderAll();
  showToast("20件の項目を登録しました", "success");
}

function renderCategoriesTab() {
  const container = document.getElementById("categories-content");
  const sortedCategories = getSortedCategories();

  if (sortedCategories.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📁</div>
        <p>カテゴリがまだ登録されていません。</p>
        ${renderSampleCategoryButton()}
      </div>
    `;
    return;
  }

  const selectedCount = sortedCategories.filter(category => selectedCategoryIds.has(category.id)).length;
  const bulkToolbarHtml = categoryDeleteMode ? `
    <div class="bulk-toolbar">
      <div class="bulk-actions bulk-actions--delete-mode">
        <button type="button" class="btn btn--ghost btn--sm" onclick="handleSelectAllCategories()">
          全選択
        </button>
        <button type="button" class="btn btn--ghost btn--sm" onclick="handleClearAllCategories()" ${selectedCount === 0 ? "disabled" : ""}>
          全解除
        </button>
        <button type="button" class="btn btn--ghost btn--sm" onclick="handleCancelCategoryDeleteMode()">
          キャンセル
        </button>
        <button type="button" class="btn btn--danger btn--sm" onclick="handleBulkDeleteCategories()" ${selectedCount === 0 ? "disabled" : ""}>
          選択したカテゴリを削除
        </button>
      </div>
      <div class="bulk-toolbar__count">${selectedCount}件選択中</div>
    </div>
  ` : "";

  let html = `
    ${bulkToolbarHtml}
    <div class="data-table">
  `;

  sortedCategories.forEach(category => {
    const usageCount = items.filter(item => item.categoryId === category.id).length;
    html += `
      <div class="data-row" data-id="${category.id}" ondragover="handleDragOver(event)" ondrop="handleDrop(event, 'category')">
        ${categoryDeleteMode ? `
          <label class="row-select" aria-label="${escapeHtml(category.name)}を選択">
            <input type="checkbox" ${selectedCategoryIds.has(category.id) ? "checked" : ""} onchange="handleCategorySelectionChange('${category.id}', this.checked)" />
          </label>
        ` : `<div class="data-row__drag-handle" title="ドラッグして並び替え" draggable="true" ondragstart="handleDragStart(event, '${category.id}')">⋮⋮</div>`}
        <div class="data-row__main">
          <span class="data-row__name">${escapeHtml(category.name)}</span>
          <span class="data-row__sub">${usageCount}件の項目で使用中</span>
        </div>
        <div class="data-row__actions">
          <button class="btn btn--icon btn--edit" onclick="handleEditCategory('${category.id}')" title="編集" ${categoryDeleteMode ? "disabled" : ""}>✏️</button>
          <button class="btn btn--icon btn--delete" onclick="handleDeleteCategory('${category.id}')" title="削除" ${categoryDeleteMode ? "disabled" : ""}>🗑️</button>
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
      <div class="bulk-actions bulk-actions--delete-mode">
        <button type="button" class="btn btn--ghost btn--sm" onclick="handleSelectAllItems()">
          全選択
        </button>
        <button type="button" class="btn btn--ghost btn--sm" onclick="handleClearAllItems()" ${selectedCount === 0 ? "disabled" : ""}>
          全解除
        </button>
        <button type="button" class="btn btn--ghost btn--sm" onclick="handleCancelItemDeleteMode()">
          キャンセル
        </button>
        <button type="button" class="btn btn--danger btn--sm" onclick="handleBulkDeleteItems()" ${selectedCount === 0 ? "disabled" : ""}>
          選択した項目を削除
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
        <p>項目がまだ登録されていません。</p>
        ${renderSampleItemButton()}
      </div>
    `;
    return;
  }

  const selectedCount = sortedItems.filter(item => selectedItemIds.has(item.id)).length;
  let html = `${renderItemsToolbar(selectedCount)}<div class="data-table">`;

  sortedItems.forEach(item => {
    const categoryName = item.categoryId && categoryMap[item.categoryId] ? categoryMap[item.categoryId].name : "";
    const categorySubHtml = categoryName
      ? `<span class="data-row__sub">${escapeHtml(categoryName)}</span>`
      : "";

    html += `
      <div class="data-row" data-id="${item.id}" ondragover="handleDragOver(event)" ondrop="handleDrop(event, 'item')">
        ${itemDeleteMode ? `
          <label class="row-select" aria-label="${escapeHtml(item.name)}を選択">
            <input type="checkbox" ${selectedItemIds.has(item.id) ? "checked" : ""} onchange="handleItemSelectionChange('${item.id}', this.checked)" />
          </label>
        ` : `<div class="data-row__drag-handle" title="ドラッグして並び替え" draggable="true" ondragstart="handleDragStart(event, '${item.id}')">⋮⋮</div>`}
        <div class="data-row__main">
          <span class="data-row__name">${escapeHtml(item.name)}</span>
          ${categorySubHtml}
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

function deferAfterFirstPaint(callback) {
  const runWhenIdle = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(callback, { timeout: 1200 });
    } else {
      window.setTimeout(callback, 120);
    }
  };
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(runWhenIdle);
  });
}

function renderInitialApp() {
  cleanupSelections();
  renderTabs({ renderHeader: false });
  renderListTab({ renderHeader: true });
  deferAfterFirstPaint(() => {
    renderCategoriesTab();
    renderItemsTab();
  });
}

function handleShoppingModeChange(mode) {
  if (shoppingMode === "select" && mode !== "select") {
    resetPreparationCategoryFilter();
  }
  shoppingMode = mode;
  shoppingModeHelpOpen = false;
  if (mode !== "shopping") {
    hideMissionCompletePopup();
    hideMissionCountdownEffect();
  }

  document.body.classList.toggle("shopping-mode", mode === "shopping");

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

function handlePreparationCategoryFilterChange(value) {
  if (shoppingMode !== "select") return;
  preparationCategoryFilter = value || "all";
  normalizePreparationCategoryFilter();
  renderListTab();
}

function toggleCategoryLabelSettingHelp(event) {
  event.preventDefault();
  event.stopPropagation();
  categoryLabelSettingHelpOpen = !categoryLabelSettingHelpOpen;
  renderTabs();
  if (categoryLabelSettingHelpOpen) {
    requestAnimationFrame(positionCategoryLabelSettingTooltip);
  }
}

function closeCategoryLabelSettingHelp() {
  if (!categoryLabelSettingHelpOpen) return;
  categoryLabelSettingHelpOpen = false;
  renderTabs();
}

function positionCategoryLabelSettingTooltip() {
  const trigger = document.querySelector(".app-menu__setting-help");
  const tooltip = document.getElementById("category-label-setting-tooltip");
  if (!trigger || !tooltip || !categoryLabelSettingHelpOpen) return;

  const margin = 12;
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const preferredLeft = triggerRect.right - tooltipRect.width;
  const maxLeft = window.innerWidth - tooltipRect.width - margin;
  const left = Math.max(margin, Math.min(preferredLeft, maxLeft));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${triggerRect.bottom + 8}px`;
}

function handleSelectionMemoryPressStart(slot) {
  memoryLongPressTriggered = false;
  if (memoryPressTimer) {
    clearTimeout(memoryPressTimer);
  }

  memoryPressTimer = setTimeout(() => {
    memoryLongPressTriggered = true;
    memoryPressTimer = null;
    showMemoryRegistrationConfirm(slot);
  }, 650);
}

function handleSelectionMemoryPressEnd(slot) {
  if (memoryPressTimer) {
    clearTimeout(memoryPressTimer);
    memoryPressTimer = null;
    if (!memoryLongPressTriggered) {
      restoreSelectionMemory(slot);
    }
  }
}

function handleSelectionMemoryPressCancel() {
  if (memoryPressTimer) {
    clearTimeout(memoryPressTimer);
    memoryPressTimer = null;
  }
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

function handleToggleCategoryDeleteMode() {
  categoryDeleteMode = true;
  selectedCategoryIds.clear();
  renderCategoriesTab();
}

function handleCancelCategoryDeleteMode() {
  categoryDeleteMode = false;
  selectedCategoryIds.clear();
  renderCategoriesTab();
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
    if (parts.length !== 2) {
      skipped.push(`行${index + 1}: 入力形式が正しくありません`);
      return;
    }

    const [name, categoryName] = parts;
    if (!name) {
      skipped.push(`行${index + 1}: 項目名が空です`);
      return;
    }

    const matchedCategory = categoryByName[normalizeName(categoryName)] || null;
    valid.push({ name, categoryId: matchedCategory ? matchedCategory.id : null });
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
    if (parts.length !== 1) {
      skipped.push(`行${index + 1}: 入力形式が正しくありません`);
      return;
    }

    const [name] = parts;
    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      skipped.push(`行${index + 1}: カテゴリ名が空です`);
      return;
    }
    if (existingNames.has(normalizedName) || pendingNames.has(normalizedName)) {
      skipped.push(`行${index + 1}: 同名カテゴリは登録できません`);
      return;
    }

    pendingNames.add(normalizedName);
    toCreate.push({ name: normalizedName });
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
    showToast("登録できる項目がありません。", "error");
    return;
  }

  let nextSortOrder = getNextSortOrder(items);
  valid.forEach(entry => {
    addItem(entry.name, entry.categoryId, nextSortOrder);
    nextSortOrder += 10;
  });
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

  let nextSortOrder = getNextSortOrder(categories);
  toCreate.forEach(entry => {
    addCategory(entry.name, nextSortOrder);
    nextSortOrder += 10;
  });
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

function handleSelectAllCategories() {
  selectedCategoryIds = new Set(getSortedCategories().map(category => category.id));
  renderCategoriesTab();
}

function handleClearAllCategories() {
  selectedCategoryIds.clear();
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

function handleSelectAllItems() {
  selectedItemIds = new Set(getSortedItems().map(item => item.id));
  renderItemsTab();
}

function handleClearAllItems() {
  selectedItemIds.clear();
  renderItemsTab();
}

function handleEditCategory(id) {
  openEditCategoryModal(id);
}

function handleDeleteCategory(id) {
  showConfirm("このカテゴリを削除しますか？", () => {
    if (!deleteCategory(id)) {
      showToast("項目に使用中のカテゴリは削除できません。", "error");
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
    categoryDeleteMode = false;
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
  showConfirm("この項目を削除しますか？", () => {
    deleteItem(id);
    renderAll();
    showToast("項目を削除しました。", "success");
  });
}

function handleBulkDeleteItems() {
  const ids = [...selectedItemIds];
  if (ids.length === 0) return;

  showConfirm(`選択した${ids.length}件の項目を削除しますか？`, () => {
    const deletedCount = deleteItems(ids);
    itemDeleteMode = false;
    renderAll();
    showToast(`${deletedCount}件の項目を削除しました。`, "success");
  });
}

function handleToggleShoppingSelection(id, checked) {
  setItemShoppingSelection(id, checked);
  resetMissionCompleteEligibility();
  renderListTab();
}

function handleToggleCategoryLabelsSetting(checked) {
  settings.showCategoryLabelsInShoppingList = checked;
  saveAppSettings();
  renderListTab();
}

function handleToggleMovePurchasedToBottomSetting(checked) {
  settings.movePurchasedToBottom = checked;
  saveAppSettings();
  renderListTab();
}

function handleToggleProductListTwoColumnSetting(checked) {
  settings.productListTwoColumn = checked;
  saveAppSettings();
  renderListTab();
}

function isShoppingPurchaseToggleLocked() {
  return shoppingMode === "shopping" && Date.now() < shoppingToggleLockedUntil;
}

function lockShoppingPurchaseToggles() {
  if (shoppingMode !== "shopping") return;
  shoppingToggleLockedUntil = Date.now() + SHOPPING_TOGGLE_LOCK_MS;
  if (shoppingToggleLockTimer) {
    clearTimeout(shoppingToggleLockTimer);
  }
  shoppingToggleLockTimer = setTimeout(() => {
    shoppingToggleLockTimer = null;
    if (shoppingMode === "shopping") {
      renderListTab();
    }
  }, SHOPPING_TOGGLE_LOCK_MS);
}

function queueShoppingTapAnimation(type, id) {
  if (shoppingMode !== "shopping" || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
  pendingShoppingTapAnimation = { type, id };
}

function applyPendingShoppingTapAnimation() {
  if (!pendingShoppingTapAnimation || shoppingMode !== "shopping") {
    pendingShoppingTapAnimation = null;
    return;
  }

  const { type, id } = pendingShoppingTapAnimation;
  pendingShoppingTapAnimation = null;
  const rowClass = type === "memo" ? ".free-memo-row" : ".list-row";
  const row = [...document.querySelectorAll(rowClass)].find(element => element.dataset.id === id);
  if (!row) return;
  row.classList.remove("shopping-tap-feedback");
  requestAnimationFrame(() => {
    row.classList.add("shopping-tap-feedback");
    window.setTimeout(() => row.classList.remove("shopping-tap-feedback"), 140);
  });
}

function handleTogglePurchased(id) {
  if (isShoppingPurchaseToggleLocked()) return;
  const item = items.find(entry => entry.id === id);
  if (!item) return;
  const previousPurchased = item.purchased;
  const wasAllUnchecked = getShoppingCompletionState().allUnchecked;

  togglePurchased(id);
  if (item.purchased !== previousPurchased) {
    lockShoppingPurchaseToggles();
    queueShoppingTapAnimation("item", id);
    if (item.purchased && wasAllUnchecked) {
      prepareMissionRewardForShoppingStart();
    }
    if (item.purchased) {
      showMissionCountdownEffect(getShoppingCompletionState().remainingUnchecked);
    }
    showPurchasedUndo({
      type: "item",
      id,
      previousPurchased,
    });
  }
  renderListTab();
  if (item.purchased) {
    evaluateMissionComplete();
  } else {
    resetMissionCompleteEligibility();
  }
}

function handleResetShoppingSelection() {
  const targetItems = getFilteredPreparationItems();
  const isFilterActive = preparationCategoryFilter !== "all";
  showConfirm("選択中の対象を全解除しますか？", () => {
    targetItems.forEach(item => {
      item.selectedForShopping = false;
      item.purchased = false;
    });
    if (!isFilterActive) {
      freeMemos.forEach(memo => {
        memo.selectedForShopping = false;
        memo.purchased = false;
      });
    }
    saveItems();
    if (!isFilterActive) {
      saveFreeMemos();
    }
    resetMissionCompleteEligibility();
    renderListTab();
    showToast(isFilterActive ? "表示中の項目をすべて解除しました" : "対象選択を全解除しました。", "success");
  }, "全解除");
}

function handleSelectAllShoppingTargets() {
  if (shoppingMode !== "select") return;
  const targetItems = getFilteredPreparationItems();
  const isFilterActive = preparationCategoryFilter !== "all";

  targetItems.forEach(item => {
    item.selectedForShopping = true;
  });
  if (!isFilterActive) {
    freeMemos.forEach(memo => {
      memo.selectedForShopping = true;
    });
  }
  saveItems();
  if (!isFilterActive) {
    saveFreeMemos();
  }
  resetMissionCompleteEligibility();
  renderListTab();
  showToast(isFilterActive ? "表示中の項目をすべて選択しました" : "対象を全選択しました。", "success");
}

function handleAddFreeMemo() {
  const input = document.getElementById("free-memo-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) {
    showToast("フリーメモを入力してください。", "error");
    return;
  }
  if (addFreeMemo(text)) {
    input.value = "";
    renderListTab();
  } else {
    showToast("フリーメモの追加に失敗しました。", "error");
  }
}

function handleUpdateFreeMemo(id, text) {
  if (!updateFreeMemo(id, text)) {
    showToast("フリーメモの更新に失敗しました。", "error");
  }
}

function handleDeleteFreeMemo(id) {
  showConfirm("このフリーメモを削除しますか？", () => {
    deleteFreeMemo(id);
    renderListTab();
    showToast("フリーメモを削除しました。", "success");
  });
}

function handleToggleFreeMemoSelection(id) {
  toggleFreeMemoSelection(id);
  resetMissionCompleteEligibility();
  renderListTab();
}

function handleToggleFreeMemoPurchased(id) {
  if (isShoppingPurchaseToggleLocked()) return;
  const memo = freeMemos.find(entry => entry.id === id);
  if (!memo) return;
  const previousPurchased = memo.purchased;
  const wasAllUnchecked = getShoppingCompletionState().allUnchecked;

  toggleFreeMemoPurchased(id);
  if (memo.purchased !== previousPurchased) {
    lockShoppingPurchaseToggles();
    queueShoppingTapAnimation("memo", id);
    if (memo.purchased && wasAllUnchecked) {
      prepareMissionRewardForShoppingStart();
    }
    if (memo.purchased) {
      showMissionCountdownEffect(getShoppingCompletionState().remainingUnchecked);
    }
    showPurchasedUndo({
      type: "memo",
      id,
      previousPurchased,
    });
  }
  renderListTab();
  if (memo.purchased) {
    evaluateMissionComplete();
  } else {
    resetMissionCompleteEligibility();
  }
}

function setupForms() {
  document.getElementById("cat-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.target;
    const name = document.getElementById("cat-name").value.trim();

    if (!name) {
      showToast("カテゴリ名を入力してください。", "error");
      return;
    }

    if (form.dataset.mode === "add") {
      const sortOrder = getNextSortOrder(categories);
      if (!addCategory(name, sortOrder)) {
        showToast("同名カテゴリは登録できません。", "error");
        return;
      }
      showToast("カテゴリを追加しました。", "success");
    } else {
      const category = categories.find(entry => entry.id === form.dataset.editId);
      const sortOrder = category ? category.sortOrder : getNextSortOrder(categories);
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

    if (!name) {
      showToast("項目名を入力してください。", "error");
      return;
    }

    if (form.dataset.mode === "add") {
      const sortOrder = getNextSortOrder(items);
      if (!addItem(name, categoryId, sortOrder)) {
        showToast("項目を追加できませんでした。", "error");
        return;
      }
      showToast("項目を追加しました。", "success");
    } else {
      const item = items.find(entry => entry.id === form.dataset.editId);
      const sortOrder = item ? item.sortOrder : getNextSortOrder(items);
      if (!updateItem(form.dataset.editId, name, categoryId, sortOrder)) {
        showToast("項目を更新できませんでした。", "error");
        return;
      }
      showToast("項目を更新しました。", "success");
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

function renderTabs(options = {}) {
  const { renderHeader = true } = options;
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
  const categoryLabelHelpButton = document.querySelector(".app-menu__setting-help");
  const categoryLabelTooltip = document.getElementById("category-label-setting-tooltip");
  if (categoryLabelHelpButton) {
    categoryLabelHelpButton.setAttribute("aria-expanded", categoryLabelSettingHelpOpen ? "true" : "false");
  }
  if (categoryLabelTooltip) {
    categoryLabelTooltip.classList.toggle("app-menu__setting-tooltip--open", categoryLabelSettingHelpOpen);
  }
  const categoryLabelSetting = document.getElementById("setting-show-category-labels");
  if (categoryLabelSetting) {
    categoryLabelSetting.checked = Boolean(settings.showCategoryLabelsInShoppingList);
  }
  const movePurchasedToBottomSetting = document.getElementById("setting-move-purchased-to-bottom");
  if (movePurchasedToBottomSetting) {
    movePurchasedToBottomSetting.checked = settings.movePurchasedToBottom !== false;
  }
  const productListTwoColumnSetting = document.getElementById("setting-product-list-two-column");
  if (productListTwoColumnSetting) {
    productListTwoColumnSetting.checked = settings.productListTwoColumn !== false;
  }
  const appVersionLabel = document.getElementById("appVersionLabel");
  if (appVersionLabel) {
    appVersionLabel.textContent = `Ver.${APP_VERSION}`;
  }
  if (renderHeader) {
    renderAppHeader(getCurrentRemainingCount());
  }
}

function getCurrentRemainingCount() {
  return getRemainingShoppingCount(getSortedItems()) + freeMemos.filter(memo => memo.selectedForShopping && !memo.purchased).length;
}

function renderModeSwitchHelp(remainingCount) {
  const descriptions = {
    select: "今回使う項目を選ぶモードです。",
    shopping: "選択した項目を確認しながらチェックするモードです。",
  };

  return `
    <div class="mode-switch mode-switch--list" role="tablist" aria-label="チェックリストモード切替">
      <button
        type="button"
        class="btn btn--ghost mode-switch__btn mode-switch__btn--compact ${shoppingMode === "select" ? "mode-switch__btn--active" : ""}"
        onclick="handleShoppingModeChange('select')"
      >
        <span class="mode-switch__label">準備モード</span>
      </button>
      <button
        type="button"
        class="btn btn--ghost mode-switch__btn mode-switch__btn--compact ${shoppingMode === "shopping" ? "mode-switch__btn--active" : ""}"
        onclick="handleShoppingModeChange('shopping')"
      >
        <span class="mode-switch__label">実行モード <span class="mode-switch__count">(${remainingCount})</span></span>
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
        <p class="mode-help__item"><strong>準備モード</strong><span>${escapeHtml(descriptions.select)}</span></p>
        <p class="mode-help__item"><strong>実行モード</strong><span>${escapeHtml(descriptions.shopping)}</span></p>
        <p class="mode-help__item"><strong>カテゴリ <span class="mode-help__note">※準備モード時のみ</span></strong><span>表示する項目をカテゴリで絞り込みます。</span></p>
        <p class="mode-help__item"><strong>メモリボタン <span class="mode-help__note">※準備モード時のみ</span></strong><span>1 / 2 / 3 は準備モード用メモリです。<br>短押し：登録済みの選択状態を呼び出します。<br>長押し：現在の選択状態を登録します。<br>よく使う項目の組み合わせを保存しておくと、次回からワンタッチで選択できます。</span></p>
        <p class="mode-help__item"><strong>全選択 <span class="mode-help__note">※準備モード時のみ</span></strong><span>表示中の項目をすべて実行対象にします。</span></p>
        <p class="mode-help__item"><strong>全解除 <span class="mode-help__note">※準備モード時のみ</span></strong><span>表示中の項目をすべて実行対象から外します。</span></p>
      </div>
    </div>
  `;
}

function renderAppHeader(remainingCount = 0) {
  const headerContent = document.getElementById("appHeaderContent");
  if (!headerContent) return;

  if (activeTab === "items") {
    headerContent.className = "app-header__content app-header__content--title";
    headerContent.innerHTML = '<h1 class="app-header__title">項目一覧</h1>';
    return;
  }

  if (activeTab === "categories") {
    headerContent.className = "app-header__content app-header__content--title";
    headerContent.innerHTML = '<h1 class="app-header__title">カテゴリ一覧</h1>';
    return;
  }

  headerContent.className = "app-header__content app-header__content--modes";
  headerContent.innerHTML = renderModeSwitchHelp(remainingCount);
}

function renderPreparationControlPanel() {
  if (shoppingMode !== "select") return "";
  normalizePreparationCategoryFilter();
  const filterOptions = [
    `<option value="all" ${preparationCategoryFilter === "all" ? "selected" : ""}>すべて</option>`,
    ...getSortedCategories().map(category => `
      <option value="${escapeHtml(category.id)}" ${preparationCategoryFilter === category.id ? "selected" : ""}>${escapeHtml(category.name)}</option>
    `),
    `<option value="uncategorized" ${preparationCategoryFilter === "uncategorized" ? "selected" : ""}>未分類</option>`,
  ].join("");
  const categoryFilter = `
      <label class="preparation-filter">
        <span class="preparation-filter__label">カテゴリ：</span>
        <select class="preparation-filter__select" aria-label="カテゴリで絞り込み" onchange="handlePreparationCategoryFilterChange(this.value)">
          ${filterOptions}
        </select>
      </label>
    `;

  const resetButton = `
      <div class="mode-actions">
        <div class="selection-memory">
          <div class="selection-memory__buttons" aria-label="準備モード用メモリ">
            ${["1", "2", "3"].map(slot => `
              <button
                type="button"
                class="selection-memory__btn ${isSelectionMemoryEmpty(slot) ? "" : "selection-memory__btn--saved"}"
                aria-label="メモリ${getSelectionMemoryLabel(slot)} ${escapeHtml(getSelectionMemoryDisplayName(slot))}"
                title="${escapeHtml(getSelectionMemoryDisplayName(slot))}"
                onpointerdown="handleSelectionMemoryPressStart('${slot}')"
                onpointerup="handleSelectionMemoryPressEnd('${slot}')"
                onpointerleave="handleSelectionMemoryPressCancel()"
                onpointercancel="handleSelectionMemoryPressCancel()"
                oncontextmenu="event.preventDefault()"
              >
                <span class="selection-memory__label">${escapeHtml(getSelectionMemoryButtonLabel(slot))}</span>
              </button>
            `).join("")}
          </div>
        </div>
        <div class="mode-action-buttons">
          <button type="button" class="btn btn--ghost btn--sm mode-action-btn" onclick="handleSelectAllShoppingTargets()">
            全選択
          </button>
          <button type="button" class="btn btn--ghost btn--sm mode-action-btn" onclick="handleResetShoppingSelection()">
            全解除
          </button>
        </div>
      </div>
    `;
  const freeMemoInput = `
      <div class="free-memo-input free-memo-input--panel">
        <input id="free-memo-input" type="text" placeholder="フリーメモを入力" maxlength="100" onkeydown="if(event.key==='Enter') handleAddFreeMemo()" />
        <button class="btn btn--primary btn--sm" onclick="handleAddFreeMemo()">追加</button>
      </div>
    `;

  return `
    <div class="mode-panel mode-panel--list">
      ${categoryFilter}
      ${resetButton}
      ${freeMemoInput}
    </div>
  `;
}

function renderListTab(options = {}) {
  const { renderHeader = true } = options;
  const container = document.getElementById("list-content");
  const sortedItems = getSortedItems();
  const categoryMap = getCategoryMap();
  const visibleItems = shoppingMode === "shopping"
    ? sortedItems.filter(item => item.selectedForShopping)
    : getFilteredPreparationItems(sortedItems);
  const remainingCount = getRemainingShoppingCount(sortedItems) + freeMemos.filter(memo => memo.selectedForShopping && !memo.purchased).length;
  if (activeTab === "list" && renderHeader) {
    renderAppHeader(remainingCount);
  }
  const visibleMemos = shoppingMode === "shopping"
    ? freeMemos.filter(memo => memo.selectedForShopping)
    : freeMemos;
  const displayItems = getPurchasedLastEntries(visibleItems);
  const displayMemos = getPurchasedLastEntries(visibleMemos);

  if (sortedItems.length === 0 && freeMemos.length === 0) {
    container.innerHTML = `
      ${renderPreparationControlPanel()}
      <div class="empty-state">
        <div class="empty-state__icon">🧾</div>
        <p>項目管理から項目を追加すると、項目リストで準備できるようになります。</p>
        ${renderSampleItemButton()}
      </div>
    `;
    return;
  }

  if (shoppingMode === "shopping" && displayItems.length === 0 && displayMemos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">✅</div>
        <p>準備モードで今回使う項目を選んでください。</p>
        ${sortedItems.length === 0 ? renderSampleItemButton() : ""}
      </div>
    `;
    return;
  }

  let html = renderPreparationControlPanel();

  if (sortedItems.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state__icon">🧾</div>
        <p>項目管理から項目を追加すると、項目リストで準備できるようになります。</p>
        ${renderSampleItemButton()}
      </div>
    `;
  }

  if (displayMemos.length > 0) {
    html += '<div class="free-memo-list">';
    displayMemos.forEach(memo => {
      const checked = shoppingMode === "select" ? memo.selectedForShopping : memo.purchased;
      const purchaseInputDisabled = shoppingMode === "shopping" && isShoppingPurchaseToggleLocked() ? "disabled" : "";
      const changeHandler = shoppingMode === "select"
        ? `handleToggleFreeMemoSelection('${memo.id}')`
        : `handleToggleFreeMemoPurchased('${memo.id}')`;

      if (shoppingMode === "shopping") {
        html += `
          <label class="free-memo-row ${memo.purchased ? "free-memo-row--purchased" : ""}" data-id="${memo.id}">
            <span class="free-memo-row__check">
              <input
                type="checkbox"
                ${checked ? "checked" : ""}
                ${purchaseInputDisabled}
                onchange="${changeHandler}"
              />
            </span>
            <span class="free-memo-row__text">${escapeHtml(memo.text)}</span>
          </label>
        `;
        return;
      }

      html += `
        <div class="free-memo-row">
          <label class="free-memo-row__check">
            <input
              type="checkbox"
              ${checked ? "checked" : ""}
              onchange="${changeHandler}"
            />
          </label>
          <input
            class="free-memo-row__text"
            type="text"
            value="${escapeHtml(memo.text)}"
            maxlength="100"
            oninput="handleUpdateFreeMemo('${memo.id}', this.value)"
          />
          <button class="btn btn--icon btn--delete" onclick="handleDeleteFreeMemo('${memo.id}')">🗑️</button>
        </div>
      `;
    });
    html += '</div>';
  }

  // Product section
  if (displayItems.length > 0) {
    const productListLayoutClass = settings.productListTwoColumn !== false ? "list-table--compact" : "list-table--single";
    html += `<div class="list-table ${productListLayoutClass}">`;

    displayItems.forEach(item => {
      const categoryName = item.categoryId && categoryMap[item.categoryId] ? categoryMap[item.categoryId].name : "";
      const categorySubHtml = settings.showCategoryLabelsInShoppingList && categoryName
        ? `<span class="list-row__sub">${escapeHtml(categoryName)}</span>`
        : "";
      const checked = shoppingMode === "select" ? item.selectedForShopping : item.purchased;
      const purchaseInputDisabled = shoppingMode === "shopping" && isShoppingPurchaseToggleLocked() ? "disabled" : "";
      const changeHandler = shoppingMode === "select"
        ? `handleToggleShoppingSelection('${item.id}', this.checked)`
        : `handleTogglePurchased('${item.id}')`;

      html += `
        <label class="list-row ${shoppingMode === "shopping" && item.purchased ? "list-row--purchased" : ""}" data-id="${item.id}">
          <span class="list-row__check">
            <input
              type="checkbox"
              ${checked ? "checked" : ""}
              ${purchaseInputDisabled}
              onchange="${changeHandler}"
            />
          </span>
          <span class="list-row__main">
            <span class="list-row__name">${escapeHtml(item.name)}</span>
            ${categorySubHtml}
          </span>
        </label>
      `;
    });

    html += "</div>";
  }

  container.innerHTML = html;
  applyPendingShoppingTapAnimation();
}

function handleTabClick(tab) {
  if (shoppingMode === "select" && (activeTab !== "list" || tab !== "list")) {
    resetPreparationCategoryFilter();
  }
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

  document.addEventListener("click", event => {
    const tooltip = document.getElementById("category-label-setting-tooltip");
    const helpButton = document.querySelector(".app-menu__setting-help");
    if (!categoryLabelSettingHelpOpen) return;
    if (tooltip?.contains(event.target) || helpButton?.contains(event.target)) return;
    closeCategoryLabelSettingHelp();
  });
}

function isStandaloneMode() {
  const iosStandalone = window.navigator.standalone === true;
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches === true;
  return iosStandalone || displayStandalone;
}

document.addEventListener("DOMContentLoaded", () => {
  setupForms();
  setupModals();
  setupShoppingModeHelp();
  setupAppMenu();

  document.body.classList.toggle(
    "shopping-mode",
    shoppingMode === "shopping"
  );

  renderInitialApp();
});
