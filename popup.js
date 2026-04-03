const INDEX_SYMBOLS = ["000001.SS", "399001.SZ", "399006.SZ"];
const DEITY_KEYS = ["caishen", "guangong", "milefo"];
const DEITIES = {
  caishen: {
    name: "财神爷",
    copy: "愿今日红红火火，账户长虹。",
    image: "assets/caishen.png",
    video: "assets/caishen.mp4",
  },
  guangong: {
    name: "关公",
    copy: "愿持仓稳如山，关键位不破。",
    image: "assets/guanyu.png",
    video: "assets/guanyu.mp4",
  },
  milefo: {
    name: "弥勒佛",
    copy: "愿心态放松，回撤不慌。",
    image: "assets/milefo.png",
    video: "assets/milefo.mp4",
  },
};
const INCENSE_BLESSINGS = [
  "愿今日红红火火，账户长虹。",
  "愿所盯皆上涨，所买皆有回响。",
  "愿开盘有喜，收盘更喜。",
  "愿今天一路飘红，持仓节节高。",
  "愿资金如潮水，净值步步升。",
  "愿回撤收敛，利润扩张。",
  "愿关键位不破，强势股不落。",
  "愿低吸有肉，高抛有度。",
  "愿盘中少惊吓，尾盘多惊喜。",
  "愿热点常在，自选常红。",
  "愿趋势向上，账户向阳。",
  "愿大盘稳住，个股起舞。",
  "愿今日不追高，也能吃大肉。",
  "愿红柱连连，绿盘远远。",
  "愿止盈从容，止损果断，结果都好。",
  "愿每次上香，都换一次新高。",
  "愿龙头不倒，仓位不慌。",
  "愿量价齐升，收益齐来。",
  "愿东风常在，持仓常红。",
  "愿早盘埋伏，午后开花。",
  "愿买点更准，卖点更稳。",
  "愿浮亏退散，盈利上岸。",
  "愿今日看盘不白看，明日收益有交代。",
  "愿行情配合，耐心有报。",
  "愿顺势而为，账户生辉。",
  "愿消息面平静，K线面漂亮。",
  "愿每次抄底都不抄在半山腰。",
  "愿主升浪常来，震荡市少来。",
];

const searchInput = document.getElementById("search-input");
const searchResultsEl = document.getElementById("search-results");
const watchlistEl = document.getElementById("watchlist");
const indexesEl = document.getElementById("indexes");
const lastUpdatedEl = document.getElementById("last-updated");
const stockCountEl = document.getElementById("stock-count");
const heroSubEl = document.getElementById("hero-sub");
const indexesCardEl = document.getElementById("indexes-card");
const searchCardEl = document.querySelector(".search-card");
const watchCardEl = document.getElementById("watch-card");
const prayCardEl = document.getElementById("pray-card");
const deityNameEl = document.getElementById("deity-name");
const deityCopyEl = document.getElementById("deity-copy");
const deityVideoEl = document.getElementById("deity-video");
const incenseCountEl = document.getElementById("incense-count");
const qrModalEl = document.getElementById("qr-modal");
const infoModalEl = document.getElementById("info-modal");
const altarFruitsRowEl = document.getElementById("altar-fruits-row");
const praySearchOverlayEl = document.getElementById("pray-search-overlay");
const praySearchInputEl = document.getElementById("pray-search-input");
const praySearchResultsEl = document.getElementById("pray-search-results");
const detailModalEl = document.getElementById("detail-modal");
const detailBodyEl = document.getElementById("detail-body");

const state = {
  watchlist: [],
  lastQuotes: {},
  prayQuotes: {},
  draftTargets: {},
  activePopoverSymbol: null,
  praySearchDraft: "",
  activePraySlotIndex: null,
  prayDisplayedCopy: null,
  mode: "watch",
  pray: {
    deity: "caishen",
    incenseCount: 0,
    fruits: [],
  },
  detail: {
    symbol: null,
    loading: false,
    error: "",
    data: null,
    hoverIndex: null,
  },
};
let isDeityVideoPlaying = false;

const BELL_ICON = `
  <svg class="bell-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3a4 4 0 0 0-4 4v1.2c0 .9-.3 1.77-.86 2.48L5.8 12.4A2 2 0 0 0 7.37 16h9.26a2 2 0 0 0 1.57-3.6l-1.34-1.72A4 4 0 0 1 16 8.2V7a4 4 0 0 0-4-4Z" fill="currentColor"></path>
    <path d="M9.5 18a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
  </svg>
`;
const STORE_REVIEW_URL =
  "https://chromewebstore.google.com/detail/%E7%9B%AF%E7%9B%98%E5%8A%A9%E6%89%8B-%E6%91%B8%E9%B1%BC%E7%9C%8B%E7%9B%98%E5%B0%8F%E5%B8%AE%E6%89%8B%EF%BC%88%E8%B4%A2%E7%A5%9E%E4%BF%9D%E4%BD%91%E4%B8%80%E7%9B%B4%E7%BA%A2%EF%BC%89/icdblaikjdibjifnoiklopllamiaafhg/reviews";

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

function normalizePrayState(raw = {}) {
  const source = Array.isArray(raw.fruits) ? raw.fruits.slice(0, 3) : [];
  const normalized = Array.from({ length: 3 }, (_, index) => {
    const item = source[index];
    if (!item?.symbol) return null;
    return {
      symbol: item.symbol,
      name: item.name || item.symbol,
      secid: item.secid || "",
    };
  });
  return {
    deity: DEITIES[raw.deity] ? raw.deity : "caishen",
    incenseCount: Number.isFinite(raw.incenseCount) ? raw.incenseCount : 0,
    fruits: normalized,
  };
}

function createDefaultPrayFruits() {
  return [null, null, null];
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

function formatSignedPrice(val) {
  if (val === null || val === undefined || Number.isNaN(val)) return "--";
  return `${val > 0 ? "+" : ""}${Number(val).toFixed(2)}`;
}

function normalizePrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Number(num.toFixed(2));
}

function changeClass(val) {
  if (val === null || val === undefined) return "";
  if (val > 0) return "up";
  if (val < 0) return "down";
  return "";
}

function formatLargeNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const abs = Math.abs(value);
  if (abs >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
  if (abs >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
  return `${Math.round(value)}`;
}

function inferSecid(symbol) {
  if (!symbol) return null;
  if (/^\d{5}$/.test(symbol)) return `116.${symbol}`;
  if (/^[A-Z]/.test(symbol)) return `105.${symbol}`;
  if (symbol.startsWith("6") || symbol.startsWith("9")) return `1.${symbol}`;
  if (symbol.startsWith("0") || symbol.startsWith("3")) return `0.${symbol}`;
  return null;
}

function isAlertHit(currentPrice, targetPrice) {
  if (currentPrice === null || currentPrice === undefined) return false;
  return Number(currentPrice).toFixed(2) === Number(targetPrice).toFixed(2);
}

async function loadState() {
  const {
    watchlist = [],
    lastQuotes = {},
    lastUpdated = null,
    popupMode = "watch",
    prayState = {},
  } = await chrome.storage.local.get({
    watchlist: [],
    lastQuotes: {},
    lastUpdated: null,
    popupMode: "watch",
    prayState: {},
  });
  state.watchlist = normalizeWatchlist(watchlist);
  state.lastQuotes = lastQuotes;
  state.mode = popupMode === "pray" ? "pray" : "watch";
  state.pray = normalizePrayState(prayState);
  if (lastUpdated) {
    lastUpdatedEl.textContent = new Date(lastUpdated).toLocaleTimeString();
  }
}

async function saveWatchlist() {
  await chrome.storage.local.set({ watchlist: state.watchlist });
}

async function saveMode() {
  await chrome.storage.local.set({ popupMode: state.mode });
}

async function savePrayState() {
  await chrome.storage.local.set({ prayState: state.pray });
}

function updateStockCount() {
  stockCountEl.textContent = String(state.watchlist.length);
}

function updateFruitCount() {
  const fruitCountEl = document.getElementById("fruit-count");
  if (fruitCountEl) {
    fruitCountEl.textContent = String(state.pray.fruits.filter(Boolean).length);
  }
}

function getRandomBlessing() {
  return INCENSE_BLESSINGS[Math.floor(Math.random() * INCENSE_BLESSINGS.length)];
}

function rotateDeity(step) {
  const currentIndex = DEITY_KEYS.indexOf(state.pray.deity);
  const nextIndex = (currentIndex + step + DEITY_KEYS.length) % DEITY_KEYS.length;
  state.pray.deity = DEITY_KEYS[nextIndex];
  state.prayDisplayedCopy = null;
  stopDeityVideo();
}

let blessingAnimationTimer = null;
function animateBlessingText(nextText) {
  clearTimeout(blessingAnimationTimer);
  deityCopyEl.classList.remove("smoke-out", "smoke-in");
  void deityCopyEl.offsetWidth;
  deityCopyEl.classList.add("smoke-out");
  blessingAnimationTimer = setTimeout(() => {
    deityCopyEl.textContent = nextText;
    deityCopyEl.classList.remove("smoke-out");
    deityCopyEl.classList.add("smoke-in");
  }, 260);
}

function stopDeityVideo() {
  isDeityVideoPlaying = false;
  deityVideoEl.pause();
  deityVideoEl.currentTime = 0;
}

async function playDeityVideo() {
  const deity = DEITIES[state.pray.deity];
  if (!deity?.video) return;
  deityVideoEl.src = deity.video;
  deityVideoEl.currentTime = 0;
  isDeityVideoPlaying = true;
  try {
    await deityVideoEl.play();
  } catch {
    stopDeityVideo();
  }
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
    card.dataset.symbol = stock.symbol;
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
                <div class="target-popover-title">目标价</div>
                <input class="target-input popover-input" type="number" step="0.10" data-symbol="${stock.symbol}" data-type="new-target" placeholder="请输入，如 ${formatPrice(q?.price) === "--" ? "35.20" : formatPrice(q?.price)}" value="${
                  state.draftTargets[stock.symbol] ||
                  (q?.price !== null && q?.price !== undefined ? formatPrice(q.price) : "")
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

function parseTrendPoint(trend) {
  const parts = String(trend).split(",");
  const timeText = parts[0]?.split(" ")?.[1] || "--:--";
  const price = normalizePrice(parts[1]);
  return {
    time: timeText,
    price,
  };
}

function getTradingOffset(timeText) {
  const [hour, minute] = String(timeText)
    .split(":")
    .map((item) => Number(item));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
  const totalMinutes = hour * 60 + minute;
  const morningStart = 9 * 60 + 30;
  const morningEnd = 11 * 60 + 30;
  const afternoonStart = 13 * 60;
  const afternoonEnd = 15 * 60;

  if (totalMinutes <= morningStart) return 0;
  if (totalMinutes <= morningEnd) return totalMinutes - morningStart;
  if (totalMinutes < afternoonStart) return 120;
  if (totalMinutes <= afternoonEnd) return 120 + (totalMinutes - afternoonStart);
  return 240;
}

function buildTrendSvg(points, preClose) {
  if (!points.length) {
    return '<div class="detail-chart-empty">今日暂无分时数据</div>';
  }

  const width = 286;
  const height = 128;
  const paddingX = 4;
  const paddingY = 10;
  const validPrices = points.map((item) => item.price).filter((item) => item !== null);
  if (!validPrices.length) {
    return '<div class="detail-chart-empty">今日暂无分时数据</div>';
  }

  const min = Math.min(...validPrices, preClose ?? validPrices[0]);
  const max = Math.max(...validPrices, preClose ?? validPrices[0]);
  const range = Math.max(max - min, 0.01);
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  const totalTradingMinutes = 240;
  const getX = (timeText) => paddingX + (getTradingOffset(timeText) / totalTradingMinutes) * plotWidth;
  const getY = (price) =>
    paddingY + ((max - price) / range) * plotHeight;

  const line = points
    .map((point) => `${getX(point.time)},${getY(point.price ?? min)}`)
    .join(" ");
  const lastPointX = getX(points[points.length - 1]?.time || "09:30");
  const area = `${paddingX},${height - paddingY} ${line} ${lastPointX},${height - paddingY}`;
  const baseLineY = preClose !== null && preClose !== undefined ? getY(preClose) : height / 2;
  const lastPrice = points[points.length - 1]?.price ?? validPrices[validPrices.length - 1];
  const isUp = preClose !== null && preClose !== undefined ? lastPrice >= preClose : lastPrice >= validPrices[0];
  const strokeColor = isUp ? "#dc2626" : "#16a34a";
  const fillStart = isUp ? "rgba(220,38,38,0.22)" : "rgba(22,163,74,0.20)";
  const fillEnd = isUp ? "rgba(220,38,38,0.03)" : "rgba(22,163,74,0.03)";

  const lastOffset = getTradingOffset(points[points.length - 1]?.time || "09:30");
  const timeMarks = [
    { label: "09:30", offset: 0, anchor: "start" },
    { label: "10:30", offset: 60, anchor: "middle" },
    { label: "11:30", offset: 120, anchor: "middle" },
    { label: "14:00", offset: 180, anchor: "middle" },
    { label: "15:00", offset: 240, anchor: "end" },
  ];

  const hoverIndex = state.detail.hoverIndex;
  const hoverPoint =
    hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length ? points[hoverIndex] : null;
  const hoverX = hoverPoint ? getX(hoverPoint.time) : null;
  const hoverY = hoverPoint ? getY(hoverPoint.price ?? min) : null;
  const highestPoint = points.reduce((best, point) => ((point.price ?? min) > (best.price ?? min) ? point : best), points[0]);
  const lowestPoint = points.reduce((best, point) => ((point.price ?? max) < (best.price ?? max) ? point : best), points[0]);
  const highestX = getX(highestPoint.time);
  const highestY = getY(highestPoint.price ?? max);
  const lowestX = getX(lowestPoint.time);
  const lowestY = getY(lowestPoint.price ?? min);
  const highestLabelX = Math.min(Math.max(highestX, paddingX + 18), width - paddingX - 18);
  const lowestLabelX = Math.min(Math.max(lowestX, paddingX + 18), width - paddingX - 18);
  const highestLabelY = Math.max(paddingY + 10, highestY - 8);
  const lowestLabelY = Math.min(height - paddingY - 2, lowestY + 14);
  const tooltipText = hoverPoint ? `${hoverPoint.time} ${formatPrice(hoverPoint.price)}` : "";
  const tooltipWidth = Math.max(64, tooltipText.length * 6.2 + 14);
  const tooltipX = hoverPoint
    ? Math.min(Math.max(hoverX - tooltipWidth / 2, paddingX), width - paddingX - tooltipWidth)
    : 0;
  const tooltipY = hoverPoint ? Math.max(paddingY, hoverY - 22) : 0;

  return `
    <svg class="detail-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="detail-chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${fillStart}"></stop>
          <stop offset="100%" stop-color="${fillEnd}"></stop>
        </linearGradient>
      </defs>
      <line x1="${paddingX}" x2="${width - paddingX}" y1="${baseLineY}" y2="${baseLineY}" class="detail-chart-base"></line>
      <polygon points="${area}" fill="url(#detail-chart-fill)"></polygon>
      <polyline points="${line}" class="detail-chart-line" style="stroke:${strokeColor}"></polyline>
      <circle cx="${highestX}" cy="${highestY}" r="3.2" class="detail-chart-extreme-dot" style="stroke:${strokeColor}"></circle>
      <text x="${highestLabelX}" y="${highestLabelY}" class="detail-chart-extreme-label">${formatPrice(highestPoint.price)}</text>
      <circle cx="${lowestX}" cy="${lowestY}" r="3.2" class="detail-chart-extreme-dot" style="stroke:${strokeColor}"></circle>
      <text x="${lowestLabelX}" y="${lowestLabelY}" class="detail-chart-extreme-label">${formatPrice(lowestPoint.price)}</text>
      ${
        hoverPoint
          ? `<line x1="${hoverX}" x2="${hoverX}" y1="${paddingY}" y2="${height - paddingY}" class="detail-chart-hover-guide"></line>
             <circle cx="${hoverX}" cy="${hoverY}" r="4" class="detail-chart-hover-dot" style="stroke:${strokeColor}"></circle>
             <rect x="${tooltipX}" y="${tooltipY}" width="${tooltipWidth}" height="16" rx="8" class="detail-chart-tooltip-bg"></rect>
             <text x="${tooltipX + tooltipWidth / 2}" y="${tooltipY + 11}" class="detail-chart-tooltip">${tooltipText}</text>`
          : ""
      }
      <text x="${width - paddingX}" y="${baseLineY - 4}" class="detail-chart-zero">0%</text>
      ${timeMarks
        .map((item) => {
          const x = paddingX + (item.offset / totalTradingMinutes) * plotWidth;
          const classes =
            item.anchor === "middle"
              ? "detail-chart-label detail-chart-label-center"
              : item.anchor === "end"
                ? "detail-chart-label detail-chart-label-right"
                : "detail-chart-label";
          return `<text x="${x}" y="${height - 2}" class="${classes}">${item.label}</text>`;
        })
        .join("")}
    </svg>
  `;
}

function renderDetailModal() {
  if (!state.detail.symbol) {
    document.body.classList.remove("modal-open");
    document.querySelector(".container")?.classList.remove("modal-open");
    detailModalEl.classList.add("hidden");
    detailBodyEl.innerHTML = "";
    return;
  }

  document.body.classList.add("modal-open");
  document.querySelector(".container")?.classList.add("modal-open");
  detailModalEl.classList.remove("hidden");

  if (state.detail.loading) {
    detailBodyEl.innerHTML = '<div class="detail-loading">正在加载今日行情详情...</div>';
    return;
  }

  if (state.detail.error) {
    detailBodyEl.innerHTML = `<div class="detail-error">${state.detail.error}</div>`;
    return;
  }

  const detail = state.detail.data;
  if (!detail) return;
  const hoverPoint =
    state.detail.hoverIndex !== null && detail.trends[state.detail.hoverIndex]
      ? detail.trends[state.detail.hoverIndex]
      : null;
  const activePrice = hoverPoint?.price ?? detail.price;
  const activeChange =
    hoverPoint?.price !== null && hoverPoint?.price !== undefined && detail.preClose !== null
      ? normalizePrice(hoverPoint.price - detail.preClose)
      : detail.change;
  const activeChangePercent =
    hoverPoint?.price !== null && hoverPoint?.price !== undefined && detail.preClose !== null
      ? normalizePrice(((hoverPoint.price - detail.preClose) / detail.preClose) * 100)
      : detail.changePercent;

  detailBodyEl.innerHTML = `
    <div class="detail-head">
      <div>
        <div class="detail-title">${detail.name}</div>
        <div class="detail-subtitle">${getMarketLabel(detail.symbol, detail.secid)} ${detail.symbol}</div>
      </div>
    </div>
    <div class="detail-price-row">
      <div class="detail-price ${changeClass(activeChangePercent)}">${formatPrice(activePrice)}</div>
      <div class="detail-price-meta ${changeClass(activeChangePercent)}">
        <span>${formatSignedPrice(activeChange)}</span>
        <span>(${formatPercent(activeChangePercent)})</span>
      </div>
      <div class="detail-time">${hoverPoint ? hoverPoint.time : "今日最新"}</div>
    </div>
    <div class="detail-chart-card">
      ${buildTrendSvg(detail.trends, detail.preClose)}
    </div>
    <div class="detail-stats-grid">
      <div class="detail-stat"><span class="label">昨收</span><span class="value">${formatPrice(detail.preClose)}</span></div>
      <div class="detail-stat"><span class="label">今开</span><span class="value">${formatPrice(detail.open)}</span></div>
      <div class="detail-stat"><span class="label">最高</span><span class="value">${formatPrice(detail.high)}</span></div>
      <div class="detail-stat"><span class="label">最低</span><span class="value">${formatPrice(detail.low)}</span></div>
      <div class="detail-stat"><span class="label">成交量</span><span class="value">${formatLargeNumber(detail.volume)}</span></div>
      <div class="detail-stat"><span class="label">成交额</span><span class="value">${formatLargeNumber(detail.amount)}</span></div>
      <div class="detail-stat"><span class="label">振幅</span><span class="value">${detail.amplitude === null ? "--" : `${Number(detail.amplitude).toFixed(2)}%`}</span></div>
      <div class="detail-stat"><span class="label">总市值</span><span class="value">${formatLargeNumber(detail.marketCap)}</span></div>
    </div>
  `;

  bindDetailChartHover(detail);
}

function bindDetailChartHover(detail) {
  const svg = detailBodyEl.querySelector(".detail-chart-svg");
  if (!svg || !detail.trends.length) return;

  const updateHover = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const ratio = rect.width === 0 ? 0 : x / rect.width;
    const tradingOffset = ratio * 240;
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    detail.trends.forEach((point, index) => {
      const distance = Math.abs(getTradingOffset(point.time) - tradingOffset);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (state.detail.hoverIndex !== nearestIndex) {
      state.detail.hoverIndex = nearestIndex;
      renderDetailModal();
    }
  };

  svg.addEventListener("mousemove", (event) => updateHover(event.clientX));
  svg.addEventListener("mouseleave", () => {
    state.detail.hoverIndex = null;
    renderDetailModal();
  });
}

async function fetchStockDetail(stock) {
  const secid = stock.secid || inferSecid(stock.symbol);
  if (!secid) throw new Error("这只股票暂不支持查看详情");

  const quoteUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${encodeURIComponent(
    secid
  )}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f116,f168,f170&ut=b2884a393a59ad64002292a3e90d46a5&fltt=2&invt=2`;
  const trendUrl = `https://push2.eastmoney.com/api/qt/stock/trends2/get?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13,f17&fields2=f51,f52,f53,f54,f55,f56,f57,f58&ut=b2884a393a59ad64002292a3e90d46a5&secid=${encodeURIComponent(
    secid
  )}&ndays=1&iscr=0&iscca=0`;

  const [quoteRes, trendRes] = await Promise.all([fetchJson(quoteUrl), fetchJson(trendUrl)]);
  const quote = quoteRes?.data || {};
  const trendData = trendRes?.data || {};
  const trends = Array.isArray(trendData.trends) ? trendData.trends.map(parseTrendPoint) : [];
  const preClose = normalizePrice(quote.f60 ?? trendData.preClose);
  const price = normalizePrice(quote.f43);

  return {
    secid,
    symbol: stock.symbol,
    name: quote.f58 || stock.name || stock.symbol,
    price,
    preClose,
    open: normalizePrice(quote.f46),
    high: normalizePrice(quote.f44),
    low: normalizePrice(quote.f45),
    volume: Number(quote.f47),
    amount: Number(quote.f48),
    amplitude: normalizePrice(quote.f168),
    marketCap: Number(quote.f116),
    changePercent: normalizePrice(quote.f170),
    change:
      price !== null && preClose !== null ? normalizePrice(price - preClose) : null,
    trends,
  };
}

async function openStockDetail(symbol) {
  const stock = findStock(symbol);
  if (!stock) return;
  state.detail = {
    symbol,
    loading: true,
    error: "",
    data: null,
    hoverIndex: null,
  };
  renderDetailModal();
  try {
    const detail = await fetchStockDetail(stock);
    if (state.detail.symbol !== symbol) return;
    state.detail = {
      symbol,
      loading: false,
      error: "",
      data: detail,
      hoverIndex: null,
    };
  } catch (error) {
    if (state.detail.symbol !== symbol) return;
    state.detail = {
      symbol,
      loading: false,
      error: error?.message || "加载详情失败",
      data: null,
      hoverIndex: null,
    };
  }
  renderDetailModal();
}

function closeDetailModal() {
  state.detail = {
    symbol: null,
    loading: false,
    error: "",
    data: null,
    hoverIndex: null,
  };
  renderDetailModal();
}

function renderDeityDisplay() {
  const deity = DEITIES[state.pray.deity];
  deityNameEl.textContent = deity.name;
  deityCopyEl.textContent = state.prayDisplayedCopy || deity.copy;
  if (deityVideoEl.dataset.deity !== state.pray.deity) {
    stopDeityVideo();
    deityVideoEl.src = deity.video;
    deityVideoEl.dataset.deity = state.pray.deity;
    deityVideoEl.load();
  }
  incenseCountEl.textContent = String(state.pray.incenseCount);
}

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`请求失败: ${resp.status}`);
  return resp.json();
}

async function fetchPrayQuotes() {
  const secids = state.pray.fruits
    .filter(Boolean)
    .map((item) => item.secid)
    .filter(Boolean);

  if (!secids.length) {
    state.prayQuotes = {};
    renderPrayMode();
    return {};
  }

  const url = `https://push2.eastmoney.com/api/qt/ulist/get?secids=${encodeURIComponent(
    secids.join(",")
  )}&fields=f12,f14,f2,f3,f4&ut=b2884a393a59ad64002292a3e90d46a5&fltt=2&invt=2&np=1&pi=0&pz=${secids.length}`;
  const data = await fetchJson(url);
  const result = data?.data?.diff || [];
  const mapped = {};

  result.forEach((item) => {
    mapped[item.f12] = {
      symbol: item.f12,
      name: item.f14 || item.f12,
      price: normalizePrice(item.f2),
      change: normalizePrice(item.f4),
      changePercent: normalizePrice(item.f3),
    };
  });

  state.prayQuotes = mapped;
  renderPrayMode();
  return mapped;
}

function renderAltarFruitSlots() {
  altarFruitsRowEl.innerHTML = state.pray.fruits
    .map((item, index) => {
      if (!item) {
        return `<button class="altar-slot" data-slot-index="${index}">+</button>`;
      }
      const quote = state.prayQuotes[item.symbol] || state.lastQuotes[item.symbol];
      const market = getMarketLabel(item.symbol, item.secid);
      const price = quote?.price;
      const changePercent = quote?.changePercent;
      return `<div class="altar-slot filled" data-slot-index="${index}">
        <div class="altar-slot-name">${item.name || item.symbol}</div>
        <div class="altar-slot-topline">
          <span class="altar-slot-market">${market}</span>
          <span class="altar-slot-symbol">${item.symbol}</span>
        </div>
        <div class="altar-slot-quote ${changeClass(changePercent)}">
          <span>${
            price === null || price === undefined
              ? "--"
              : Number.isInteger(price)
                ? price.toFixed(0)
                : price.toFixed(2)
          }</span>
          <span>${formatPercent(changePercent)}</span>
        </div>
        <button class="altar-slot-remove" data-slot-index="${index}" title="移出">×</button>
      </div>`;
    })
    .join("");
}

function renderMode() {
  document.querySelectorAll(".title-mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === state.mode);
  });
  const inPrayMode = state.mode === "pray";
  indexesCardEl.classList.toggle("hidden", inPrayMode);
  searchCardEl.classList.toggle("hidden", inPrayMode);
  watchCardEl.classList.toggle("hidden", inPrayMode);
  prayCardEl.classList.toggle("hidden", !inPrayMode);
  heroSubEl.textContent = inPrayMode
    ? "财神保佑 · 上香祈福 · 三个供位"
    : "实时行情 · 价格提醒 · 浏览器通知";
  searchInput.placeholder = inPrayMode
    ? "输入股票代码或名称，加入供位"
    : "输入股票代码或名称搜索";
}

function renderPrayMode() {
  renderDeityDisplay();
  renderAltarFruitSlots();
  updateFruitCount();
}

async function refreshQuotes(showToast = false) {
  const [watchResult, prayResult] = await Promise.allSettled([
    chrome.runtime.sendMessage({ type: "refreshQuotes" }),
    fetchPrayQuotes(),
  ]);
  let refreshed = false;

  if (watchResult.status === "fulfilled") {
    const res = watchResult.value;
    if (res?.ok && res.quotes) {
      state.lastQuotes = res.quotes;
      lastUpdatedEl.textContent = new Date().toLocaleTimeString();
      renderIndexes(state.lastQuotes);
      renderWatchlist(state.lastQuotes);
      refreshed = true;
    }
  }

  if (prayResult.status === "fulfilled") {
    refreshed = true;
  }

  renderPrayMode();

  if (!showToast) return;
  if (!refreshed) {
    showStatus("网络异常");
  } else if (
    watchResult.status === "rejected" ||
    (watchResult.status === "fulfilled" && (!watchResult.value?.ok || !watchResult.value?.quotes))
  ) {
    showStatus("盯盘页刷新失败，供位行情已单独更新");
  } else if (prayResult.status === "rejected") {
    showStatus("盯盘页已刷新，供位行情稍后重试");
  } else {
    showStatus("已刷新");
  }
}

function showStatus(text) {
  const bar = document.getElementById("status");
  bar.textContent = text;
  bar.classList.add("visible");
  setTimeout(() => bar.classList.remove("visible"), 1500);
}

function openQrModal() {
  qrModalEl.classList.remove("hidden");
}

function closeQrModal() {
  qrModalEl.classList.add("hidden");
}

function openInfoModal() {
  infoModalEl.classList.remove("hidden");
}

function closeInfoModal() {
  infoModalEl.classList.add("hidden");
}

function openPraySearch(slotIndex) {
  state.activePraySlotIndex = slotIndex;
  praySearchOverlayEl.classList.remove("hidden");
  praySearchInputEl.value = state.praySearchDraft;
  praySearchInputEl.focus();
  renderPraySearchResults();
}

function closePraySearch() {
  praySearchOverlayEl.classList.add("hidden");
  state.praySearchDraft = "";
  state.activePraySlotIndex = null;
  praySearchInputEl.value = "";
  praySearchResultsEl.innerHTML = "";
}

let searchTimer = null;
function bindSearch() {
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const val = searchInput.value.trim();
    if (!val) {
      searchResultsEl.innerHTML = "";
      searchCardEl.classList.remove("has-results");
      return;
    }
    searchCardEl.classList.add("has-results");
    searchTimer = setTimeout(() => searchStock(val), 350);
  });
}

function renderSearchResults(list) {
  searchResultsEl.innerHTML = "";
  searchCardEl.classList.add("has-results");
  if (!list.length) {
    searchResultsEl.innerHTML = '<div class="empty">暂无结果</div>';
    return;
  }
  list.forEach((item) => {
    const watched = state.watchlist.some((stock) => stock.symbol === item.symbol);
    const prayed = state.pray.fruits.some((stock) => stock?.symbol === item.symbol);
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
        state.mode === "pray"
          ? prayed
            ? '<span class="search-status followed">✓ 已上供</span>'
            : `<button class="add" data-symbol="${item.symbol}" data-name="${
                item.shortname || item.longname || ""
              }" data-secid="${item.secid || ""}" data-mode="pray">上供</button>`
          : watched
            ? '<span class="search-status followed">✓ 已关注</span>'
            : `<button class="add" data-symbol="${item.symbol}" data-name="${
                item.shortname || item.longname || ""
              }" data-secid="${item.secid || ""}" data-mode="watch">关注</button>`
      }
    `;
    searchResultsEl.appendChild(row);
  });
}

function getPraySearchFallbackList() {
  return state.watchlist
    .filter((item) => item?.symbol)
    .map((item) => ({
      symbol: item.symbol,
      shortname: item.name,
      longname: item.name,
      secid: item.secid || "",
    }));
}

function renderPraySearchResults(list = null) {
  const sourceList = Array.isArray(list) ? list : getPraySearchFallbackList();
  praySearchResultsEl.innerHTML = "";
  if (!sourceList.length) {
    praySearchResultsEl.innerHTML =
      '<div class="empty">暂无关注股票，先去盯盘助手里添加关注，或直接搜索上供</div>';
    return;
  }
  sourceList.forEach((item) => {
    const prayed = state.pray.fruits.some((stock) => stock?.symbol === item.symbol);
    const row = document.createElement("div");
    row.className = "pray-result-row";
    row.innerHTML = `
      <div class="pray-result-main">
        <div class="pray-result-name">${item.shortname || item.longname || item.symbol}</div>
        <div class="symbol-row">
          <div class="market-badge">${getMarketLabel(item.symbol, item.secid)}</div>
          <div class="symbol">${item.symbol}</div>
        </div>
      </div>
      ${
        prayed
          ? '<span class="search-status followed">✓ 已上供</span>'
          : `<button class="add" data-symbol="${item.symbol}" data-name="${
              item.shortname || item.longname || ""
            }" data-secid="${item.secid || ""}" data-mode="pray-overlay">上供</button>`
      }
    `;
    praySearchResultsEl.appendChild(row);
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
    searchCardEl.classList.add("has-results");
    searchResultsEl.innerHTML = `<div class="empty">${err.message || "搜索异常"}</div>`;
  }
}

async function searchPrayStock(keyword) {
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(
      keyword
    )}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("搜索失败");
    const data = await resp.json();
    const quotes = (data?.QuotationCodeTable?.Data || []).map((item) => ({
      symbol: item.Code,
      shortname: item.Name,
      longname: item.Name,
      secid: item.QuoteID,
    }));
    renderPraySearchResults(quotes);
  } catch (err) {
    praySearchResultsEl.innerHTML = `<div class="empty">${err.message || "搜索异常"}</div>`;
  }
}

function findStock(symbol) {
  return state.watchlist.find((item) => item.symbol === symbol);
}

function bindWatchlistEvents() {
  watchlistEl.addEventListener("click", async (e) => {
    const target = e.target;
    const stockCard = target.closest(".stock-card");
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
      renderSearchResultsFromInput();
      refreshQuotes();
      return;
    }

    if (bellBtn) {
      const symbol = bellBtn.dataset.symbol;
      const quote = state.lastQuotes[symbol];
      state.activePopoverSymbol = state.activePopoverSymbol === symbol ? null : symbol;
      if (state.activePopoverSymbol && !state.draftTargets[symbol]) {
        state.draftTargets[symbol] =
          quote?.price !== null && quote?.price !== undefined ? formatPrice(quote.price) : "";
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
      return;
    }

    if (stockCard && !target.closest("button") && !target.closest("input")) {
      openStockDetail(stockCard.dataset.symbol);
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
    const button = watchlistEl.querySelector(
      `button.confirm-target[data-symbol="${target.dataset.symbol}"]`
    );
    if (button) button.click();
  });
}

function bindPrayEvents() {
  prayCardEl.addEventListener("click", async (e) => {
    const incenseBtn = e.target.closest("#incense-btn");
    const altarSlotBtn = e.target.closest(".altar-slot");
    const altarRemoveBtn = e.target.closest(".altar-slot-remove");
    const prevBtn = e.target.closest("#deity-prev");
    const nextBtn = e.target.closest("#deity-next");

    if (prevBtn) {
      rotateDeity(-1);
      await savePrayState();
      renderPrayMode();
      return;
    }

    if (nextBtn) {
      rotateDeity(1);
      await savePrayState();
      renderPrayMode();
      return;
    }

    if (incenseBtn) {
      state.pray.incenseCount += 1;
      const blessing = getRandomBlessing();
      state.prayDisplayedCopy = blessing;
      await savePrayState();
      incenseCountEl.textContent = String(state.pray.incenseCount);
      animateBlessingText(blessing);
      playDeityVideo();
      return;
    }

    if (altarSlotBtn && !altarSlotBtn.classList.contains("filled")) {
      openPraySearch(Number(altarSlotBtn.dataset.slotIndex));
      return;
    }

    if (altarRemoveBtn) {
      const index = Number(altarRemoveBtn.dataset.slotIndex);
      state.pray.fruits[index] = null;
      await savePrayState();
      await fetchPrayQuotes().catch(() => {});
      renderPrayMode();
      renderPraySearchResults();
    }
  });
}

function bindSearchResultsClick() {
  searchResultsEl.addEventListener("click", async (e) => {
    const button = e.target.closest("button.add");
    if (!button) return;
    const symbol = button.dataset.symbol;
    const name = button.dataset.name || symbol;
    const secid = button.dataset.secid || null;
    const mode = button.dataset.mode;

    if (mode === "pray") {
      if (state.pray.fruits.some((s) => s?.symbol === symbol)) {
        showStatus("这只已经在供位上");
        return;
      }
      const emptyIndex = state.pray.fruits.findIndex((item) => !item);
      if (emptyIndex === -1) {
        openQrModal();
        return;
      }
      state.pray.fruits[emptyIndex] = { symbol, name, secid };
      await savePrayState();
      await fetchPrayQuotes().catch(() => {});
      renderPrayMode();
      searchInput.value = "";
      searchResultsEl.innerHTML = "";
      searchCardEl.classList.remove("has-results");
      showStatus("已上供");
      return;
    }

    if (state.watchlist.some((s) => s.symbol === symbol)) {
      showStatus("已在关注列表");
      return;
    }
    state.watchlist.unshift({
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
    searchCardEl.classList.remove("has-results");
    refreshQuotes(true);
    showStatus("已添加关注");
  });
}

function bindPraySearch() {
  let praySearchTimer = null;

  praySearchInputEl.addEventListener("input", () => {
    clearTimeout(praySearchTimer);
    const value = praySearchInputEl.value.trim();
    state.praySearchDraft = value;
    if (!value) {
      renderPraySearchResults();
      return;
    }
    praySearchTimer = setTimeout(() => searchPrayStock(value), 250);
  });

  praySearchResultsEl.addEventListener("click", async (e) => {
    const button = e.target.closest("button.add");
    if (!button) return;
    const symbol = button.dataset.symbol;
    const name = button.dataset.name || symbol;
    const secid = button.dataset.secid || null;
    if (state.pray.fruits.some((s) => s?.symbol === symbol)) {
      showStatus("这只已经在供位上");
      return;
    }
    if (state.pray.fruits.filter(Boolean).length >= 3 || state.activePraySlotIndex === null) {
      openQrModal();
      return;
    }
    state.pray.fruits[state.activePraySlotIndex] = { symbol, name, secid };
    await savePrayState();
    await fetchPrayQuotes().catch(() => {});
    renderPrayMode();
    closePraySearch();
    showStatus("已上供");
  });
}

function bindModeSwitch() {
  document.getElementById("mode-switch").addEventListener("click", async (e) => {
    const btn = e.target.closest(".title-mode-btn");
    if (!btn) return;
    state.mode = btn.dataset.mode;
    await saveMode();
    renderMode();
    renderSearchResultsFromInput();
  });
}

function bindModal() {
  qrModalEl.addEventListener("click", (e) => {
    if (e.target.dataset.closeModal === "true" || e.target.id === "close-qr-modal") {
      closeQrModal();
    }
  });

  infoModalEl.addEventListener("click", (e) => {
    if (e.target.dataset.closeInfoModal === "true" || e.target.id === "close-info-modal") {
      closeInfoModal();
    }
  });

  detailModalEl.addEventListener("click", (e) => {
    if (e.target.dataset.closeDetailModal === "true" || e.target.id === "close-detail-modal") {
      closeDetailModal();
    }
  });

  detailModalEl.addEventListener(
    "wheel",
    (e) => {
      if (!detailBodyEl.contains(e.target)) {
        e.preventDefault();
      }
      e.stopPropagation();
    },
    { passive: false }
  );

  praySearchOverlayEl.addEventListener("click", (e) => {
    if (e.target === praySearchOverlayEl || e.target.id === "close-pray-search") {
      closePraySearch();
    }
  });
}

function renderSearchResultsFromInput() {
  const value = searchInput.value.trim();
  if (!value) {
    searchResultsEl.innerHTML = "";
    searchCardEl.classList.remove("has-results");
    return;
  }
  searchCardEl.classList.add("has-results");
  searchStock(value);
}

async function ensureNotificationPermission() {
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

function bindActions() {
  document.getElementById("refresh-btn").addEventListener("click", () => refreshQuotes(true));
  document.getElementById("info-btn").addEventListener("click", openInfoModal);
  document.getElementById("review-btn").addEventListener("click", async () => {
    await chrome.tabs.create({ url: STORE_REVIEW_URL });
    closeInfoModal();
  });
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
    renderPrayMode();
  }
  if (changes.lastUpdated?.newValue) {
    lastUpdatedEl.textContent = new Date(changes.lastUpdated.newValue).toLocaleTimeString();
  }
  if (changes.prayState) {
    state.pray = normalizePrayState(changes.prayState.newValue || {});
    fetchPrayQuotes().catch(() => {});
    renderPrayMode();
    renderSearchResultsFromInput();
  }
});

async function init() {
  await loadState();
  if (!state.pray.fruits.some(Boolean)) {
    state.pray.fruits = createDefaultPrayFruits();
    await savePrayState();
  }
  chrome.runtime.sendMessage({ type: "clearBadge" }).catch(() => {});
  renderMode();
  renderIndexes(state.lastQuotes);
  renderWatchlist(state.lastQuotes);
  renderPrayMode();
  bindModeSwitch();
  bindSearch();
  bindSearchResultsClick();
  bindWatchlistEvents();
  bindPrayEvents();
  bindPraySearch();
  bindModal();
  bindActions();
  deityVideoEl.addEventListener("ended", stopDeityVideo);
  deityVideoEl.addEventListener("error", stopDeityVideo);
  deityVideoEl.addEventListener("loadeddata", () => {
    if (isDeityVideoPlaying) return;
    deityVideoEl.pause();
    deityVideoEl.currentTime = 0;
  });
  await fetchPrayQuotes().catch(() => {});
  refreshQuotes();
  renderSearchResultsFromInput();
}

document.addEventListener("DOMContentLoaded", init);
