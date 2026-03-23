const INDEX_SYMBOLS = ["000001.SS", "399001.SZ", "399006.SZ"];
const searchInput = document.getElementById("search-input");
const searchResultsEl = document.getElementById("search-results");
const watchlistEl = document.getElementById("watchlist");
const indexesEl = document.getElementById("indexes");
const lastUpdatedEl = document.getElementById("last-updated");
const stockCountEl = document.getElementById("stock-count");

const state = {
  watchlist: [],
  lastQuotes: {},
  draftTargets: {},
  activePopoverSymbol: null,
};

const BELL_ICON = `
  <svg class="bell-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a4 4 0 0 0-4 4v1.2c0 .9-.3 1.77-.86 2.48L5.8 12.4A2 2 0 0 0 7.37 16h9.26a2 2 0 0 0 1.57-3.6l-1.34-1.72A4 4 0 0 1 16 8.2V7a4 4 0 0 0-4-4Z" fill="currentColor"></path>
    <path d="M9.5 18a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
  </svg>
`;

function makeAlertId() {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAlertPrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Number(num.toFixed(2));
}

function normalizeAlerts(rawAlerts, legacyPrice = null, legacyPrices = []) {
  if (Array.isArray(rawAlerts) && rawAlerts.length) {
    return rawAlerts
      .map((item) => {
        const price = normalizeAlertPrice(item?.price);
        if (price === null) return null;
        return {
          id: item?.id || makeAlertId(),
          price,
        };
      })
      .filter(Boolean);
  }
  if (Array.isArray(legacyPrices) && legacyPrices.length) {
    return legacyPrices
      .map((price) => normalizeAlertPrice(price))
      .filter((price) => price !== null)
      .map((price) => ({ id: makeAlertId(), price }));
  }
  const legacy = normalizeAlertPrice(legacyPrice);
  return legacy === null ? [] : [{ id: makeAlertId(), price: legacy }];
}

function normalizeWatchlist(rawWatchlist) {
  return rawWatchlist.map((item) => ({
    ...item,
    alerts: normalizeAlerts(item.alerts, item.alertPrice, item.alertPrices),
  }));
}

function getMarketLabel(symbol, secid = "") {
  const code = String(symbol || "");
  const sec = String(secid || "");
  if (
    sec.startsWith("116.") ||
    sec.startsWith("128.") ||
    sec.startsWith("124.") ||
    sec.startsWith("130.") ||
    /^\d{5}$/.test(code)
  ) {
    return "HK";
  }
  if (
    sec.startsWith("105.") ||
    sec.startsWith("106.") ||
    sec.startsWith("153.") ||
    /^[A-Z]/.test(code)
  ) {
    return "US";
  }
  if (code.endsWith(".SS") || sec.startsWith("1.") || code.startsWith("6") || code.startsWith("9")) {
    return "SH";
  }
  if (code.endsWith(".SZ") || sec.startsWith("0.") || code.startsWith("0") || code.startsWith("3")) {
    return "SZ";
  }
  return "--";
}

function formatPercent(val) {
  if (val === null || val === undefined || Number.isNaN(val)) return "--";
  return `${val > 0 ? "+" : ""}${val.toFixed(2)}%`;
}

function formatPrice(val) {
  if (val === null || val === undefined || Number.isNaN(val)) return "--";
  return Number(val).toFixed(2);
}

function changeClass(val) {
  if (val === null || val === undefined) return "";
  if (val > 0) return "up";
  if (val < 0) return "down";
  return "";
}

function isAlertHit(currentPrice, targetPrice) {
  if (currentPrice === null || currentPrice === undefined) return false;
  return Number(currentPrice).toFixed(2) === Number(targetPrice).toFixed(2);
}

async function loadState() {
  const { watchlist = [], lastQuotes = {}, lastUpdated = null } =
    await chrome.storage.local.get({
      watchlist: [],
      lastQuotes: {},
      lastUpdated: null,
    });
  state.watchlist = normalizeWatchlist(watchlist);
  state.lastQuotes = lastQuotes;
  if (lastUpdated) {
    lastUpdatedEl.textContent = new Date(lastUpdated).toLocaleTimeString();
  }
}

async function saveWatchlist() {
  await chrome.storage.local.set({ watchlist: state.watchlist });
}

function updateStockCount() {
  stockCountEl.textContent = String(state.watchlist.length);
}

function renderIndexes(quotes) {
  indexesEl.innerHTML = "";
  INDEX_SYMBOLS.forEach((sym) => {
    const q = quotes[sym];
    const item = document.createElement("div");
    item.className = "index-item";
    item.innerHTML = `
      <div class="index-name">${q?.name || sym}</div>
      <div class="index-price ${changeClass(q?.changePercent)}">${formatPrice(q?.price)}</div>
      <div class="index-change ${changeClass(q?.changePercent)}">${formatPercent(q?.changePercent)}</div>
    `;
    indexesEl.appendChild(item);
  });
}

function renderAlerts(stock, quote) {
  return stock.alerts
    .map((alert) => {
      const hit = isAlertHit(quote?.price, alert.price);
      return `
        <div class="target-tag ${hit ? "hit shake" : ""}" title="${hit ? "已到目标价" : "监控中"}">
          ${BELL_ICON}
          <span>${alert.price.toFixed(2)}</span>
          <button class="target-tag-remove" data-symbol="${stock.symbol}" data-alert-id="${alert.id}" title="删除目标价">×</button>
        </div>
      `;
    })
    .join("");
}

function renderWatchlist(quotes) {
  watchlistEl.innerHTML = "";
  updateStockCount();
  if (!state.watchlist.length) {
    watchlistEl.innerHTML = '<div class="empty">暂无关注，搜索股票后添加</div>';
    return;
  }
  state.watchlist.forEach((stock) => {
    const q = quotes[stock.symbol];
    const popoverOpen = state.activePopoverSymbol === stock.symbol;
    const hasAlerts = stock.alerts.length > 0;
    const card = document.createElement("div");
    card.className = "stock-card";
    card.innerHTML = `
      <div class="stock-header">
        <div class="stock-info">
          <div class="stock-name">${stock.name || stock.symbol}</div>
          <div class="symbol-row">
            <div class="market-badge">${getMarketLabel(stock.symbol, stock.secid)}</div>
            <div class="stock-symbol">${stock.symbol}</div>
          </div>
        </div>
        <div class="quote-side">
          <div class="quote ${changeClass(q?.changePercent)}">
            <span class="price">${formatPrice(q?.price)}</span>
            <span class="change-text ${changeClass(q?.changePercent)}">${formatPercent(
              q?.changePercent
            )}</span>
          </div>
          <div class="quote-actions-overlay">
            <button class="bell-btn" data-symbol="${stock.symbol}" title="设置目标价">${BELL_ICON}<span>目标价提醒</span></button>
            <button class="remove-stock-inline" data-symbol="${stock.symbol}" title="移除关注">移除关注</button>
          </div>
        </div>
      </div>
      ${
        hasAlerts
          ? `<div class="alert-panel multi-alert-panel">
              <div class="targets-list tags-only">
                ${renderAlerts(stock, q)}
              </div>
            </div>`
          : ""
      }
      ${
        popoverOpen
          ? `<div class="target-popover">
              <div class="target-entry popover-entry">
                <div class="target-popover-title">设置目标价</div>
                <input class="target-input popover-input" type="number" step="0.01" data-symbol="${stock.symbol}" data-type="new-target" placeholder="输入目标价，如 35.20" value="${
                  state.draftTargets[stock.symbol] || ""
                }">
                <button class="confirm-target" data-symbol="${stock.symbol}">确定</button>
              </div>
            </div>`
          : ""
      }
    `;
    watchlistEl.appendChild(card);
  });
}

async function refreshQuotes(showToast = false) {
  try {
    const res = await chrome.runtime.sendMessage({ type: "refreshQuotes" });
    if (res?.ok && res.quotes) {
      state.lastQuotes = res.quotes;
      lastUpdatedEl.textContent = new Date().toLocaleTimeString();
      renderIndexes(state.lastQuotes);
      renderWatchlist(state.lastQuotes);
      if (showToast) showStatus("已刷新");
    } else {
      throw new Error(res?.error || "刷新失败");
    }
  } catch (err) {
    showStatus(err.message || "网络异常");
  }
}

function showStatus(text) {
  const bar = document.getElementById("status");
  bar.textContent = text;
  bar.classList.add("visible");
  setTimeout(() => bar.classList.remove("visible"), 1500);
}

let searchTimer = null;
function bindSearch() {
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const val = searchInput.value.trim();
    if (!val) {
      searchResultsEl.innerHTML = "";
      return;
    }
    searchTimer = setTimeout(() => searchStock(val), 350);
  });
}

function renderSearchResults(list) {
  searchResultsEl.innerHTML = "";
  if (!list.length) {
    searchResultsEl.innerHTML = '<div class="empty">暂无结果</div>';
    return;
  }
  list.forEach((item) => {
    const watched = state.watchlist.some((stock) => stock.symbol === item.symbol);
    const row = document.createElement("div");
    row.className = "row search-row";
    row.innerHTML = `
      <div class="row-main">
        <div class="name">${item.shortname || item.longname || item.symbol}</div>
        <div class="symbol-row">
          <div class="market-badge">${getMarketLabel(item.symbol, item.secid)}</div>
          <div class="symbol">${item.symbol}</div>
        </div>
      </div>
      ${
        watched
          ? '<span class="search-status followed">已关注</span>'
          : `<button class="add" data-symbol="${item.symbol}" data-name="${
              item.shortname || item.longname || ""
            }" data-secid="${item.secid || ""}">关注</button>`
      }
    `;
    searchResultsEl.appendChild(row);
  });
}

async function searchStock(keyword) {
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(
      keyword
    )}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=6`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("搜索失败");
    const data = await resp.json();
    const quotes = (data?.QuotationCodeTable?.Data || []).map((item) => ({
      symbol: item.Code,
      shortname: item.Name,
      longname: item.Name,
      secid: item.QuoteID,
    }));
    renderSearchResults(quotes);
  } catch (err) {
    searchResultsEl.innerHTML = `<div class="empty">${err.message || "搜索异常"}</div>`;
  }
}

function findStock(symbol) {
  return state.watchlist.find((item) => item.symbol === symbol);
}

function bindWatchlistEvents() {
  watchlistEl.addEventListener("click", async (e) => {
    const target = e.target;
    const removeStockBtn = target.closest("button.remove-stock-inline");
    const bellBtn = target.closest("button.bell-btn");
    const confirmBtn = target.closest("button.confirm-target");
    const removeTargetBtn = target.closest("button.target-tag-remove");

    if (removeStockBtn) {
      const symbol = removeStockBtn.dataset.symbol;
      state.watchlist = state.watchlist.filter((s) => s.symbol !== symbol);
      delete state.draftTargets[symbol];
      if (state.activePopoverSymbol === symbol) state.activePopoverSymbol = null;
      await saveWatchlist();
      renderWatchlist(state.lastQuotes);
      refreshQuotes();
      return;
    }

    if (bellBtn) {
      const symbol = bellBtn.dataset.symbol;
      state.activePopoverSymbol = state.activePopoverSymbol === symbol ? null : symbol;
      if (state.activePopoverSymbol && !state.draftTargets[symbol]) {
        state.draftTargets[symbol] = "";
      }
      renderWatchlist(state.lastQuotes);
      const input = watchlistEl.querySelector(`input.popover-input[data-symbol="${symbol}"]`);
      if (input) input.focus();
      return;
    }

    if (confirmBtn) {
      const stock = findStock(confirmBtn.dataset.symbol);
      if (!stock) return;
      const nextPrice = normalizeAlertPrice(state.draftTargets[stock.symbol]);
      if (nextPrice === null) {
        showStatus("请输入两位小数的目标价");
        return;
      }
      if (stock.alerts.some((item) => item.price === nextPrice)) {
        showStatus("这个目标价已经在监控中");
        return;
      }
      stock.alerts.push({ id: makeAlertId(), price: nextPrice });
      state.draftTargets[stock.symbol] = "";
      state.activePopoverSymbol = null;
      await saveWatchlist();
      renderWatchlist(state.lastQuotes);
      return;
    }

    if (removeTargetBtn) {
      const stock = findStock(removeTargetBtn.dataset.symbol);
      if (!stock) return;
      stock.alerts = stock.alerts.filter((item) => item.id !== removeTargetBtn.dataset.alertId);
      await saveWatchlist();
      renderWatchlist(state.lastQuotes);
    }
  });

  watchlistEl.addEventListener("change", async (e) => {
    const target = e.target;
    if (!target.matches("input[data-type='new-target']")) return;
    const normalized = normalizeAlertPrice(target.value.trim());
    if (target.value.trim() === "") {
      state.draftTargets[target.dataset.symbol] = "";
      return;
    }
    if (normalized === null) {
      showStatus("目标价必须是数字，保留两位小数");
      target.value = state.draftTargets[target.dataset.symbol] || "";
      return;
    }
    state.draftTargets[target.dataset.symbol] = normalized.toFixed(2);
    target.value = normalized.toFixed(2);
    await ensureNotificationPermission();
  });

  watchlistEl.addEventListener("keydown", async (e) => {
    const target = e.target;
    if (!target.matches("input[data-type='new-target']")) return;
    if (e.key !== "Enter") return;
    e.preventDefault();
    const button = watchlistEl.querySelector(`button.confirm-target[data-symbol="${target.dataset.symbol}"]`);
    if (button) button.click();
  });
}

function bindSearchResultsClick() {
  searchResultsEl.addEventListener("click", async (e) => {
    const target = e.target;
    if (!target.matches("button.add")) return;
    const symbol = target.dataset.symbol;
    const name = target.dataset.name || symbol;
    const secid = target.dataset.secid || null;
    if (state.watchlist.some((s) => s.symbol === symbol)) {
      showStatus("已在关注列表");
      return;
    }
    state.watchlist.push({
      symbol,
      name,
      secid,
      alerts: [],
    });
    state.draftTargets[symbol] = "";
    await saveWatchlist();
    renderWatchlist(state.lastQuotes);
    searchInput.value = "";
    searchResultsEl.innerHTML = "";
    refreshQuotes(true);
    showStatus("已添加关注");
  });
}

async function ensureNotificationPermission() {
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

function bindActions() {
  document.getElementById("refresh-btn").addEventListener("click", () => refreshQuotes(true));
  document.addEventListener("click", (e) => {
    if (
      e.target.closest(".bell-btn") ||
      e.target.closest(".target-popover") ||
      e.target.closest(".confirm-target")
    ) {
      return;
    }
    if (state.activePopoverSymbol !== null) {
      state.activePopoverSymbol = null;
      renderWatchlist(state.lastQuotes);
    }
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.watchlist) {
    state.watchlist = normalizeWatchlist(changes.watchlist.newValue || []);
    renderWatchlist(state.lastQuotes);
  }
  if (changes.lastQuotes) {
    state.lastQuotes = changes.lastQuotes.newValue || {};
    renderIndexes(state.lastQuotes);
    renderWatchlist(state.lastQuotes);
  }
  if (changes.lastUpdated?.newValue) {
    lastUpdatedEl.textContent = new Date(changes.lastUpdated.newValue).toLocaleTimeString();
  }
});

async function init() {
  await loadState();
  chrome.runtime.sendMessage({ type: "clearBadge" }).catch(() => {});
  renderIndexes(state.lastQuotes);
  renderWatchlist(state.lastQuotes);
  bindSearch();
  bindSearchResultsClick();
  bindWatchlistEvents();
  bindActions();
  refreshQuotes();
}

document.addEventListener("DOMContentLoaded", init);
