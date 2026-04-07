const CN_INDEX_SYMBOLS = [
  { symbol: "000001.SS", secid: "1.000001" },
  { symbol: "399001.SZ", secid: "0.399001" },
  { symbol: "399006.SZ", secid: "0.399006" },
];
const US_INDEX_SYMBOLS = [
  { symbol: "NDX", secid: "100.NDX" },
  { symbol: "SPX", secid: "100.SPX" },
  { symbol: "DJIA", secid: "100.DJIA" },
];
const INDEX_SYMBOLS = [...CN_INDEX_SYMBOLS, ...US_INDEX_SYMBOLS];
const POLL_MINUTES = 1;
const EASTMONEY_UT = "b2884a393a59ad64002292a3e90d46a5";
const DEFAULT_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAF0lEQVQoU2NkYGD4z0AEMFGMAgBbwQIC8DqGLQAAAABJRU5ErkJggg==";

async function loadWatchlist() {
  const { watchlist = [] } = await chrome.storage.local.get({ watchlist: [] });
  return normalizeWatchlist(watchlist);
}

async function loadAlertCache() {
  const { alertCache = {} } = await chrome.storage.local.get({ alertCache: {} });
  return alertCache;
}

async function saveAlertCache(cache) {
  await chrome.storage.local.set({ alertCache: cache });
}

async function saveLastQuotes(quotes) {
  await chrome.storage.local.set({ lastQuotes: quotes, lastUpdated: Date.now() });
}

async function loadNotificationMap() {
  const { notificationMap = {} } = await chrome.storage.local.get({ notificationMap: {} });
  return notificationMap;
}

async function saveNotificationMap(notificationMap) {
  await chrome.storage.local.set({ notificationMap });
}

async function setBadgeCount(count) {
  await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
  await chrome.action.setBadgeTextColor({ color: "#ffffff" });
  await chrome.action.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : "" });
  await chrome.action.setTitle({
    title: count > 0 ? `盯盘助手：${count} 个目标价已触发` : "盯盘助手",
  });
}

function normalizePrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Number(num.toFixed(2));
}

function normalizeAlerts(rawAlerts, legacyPrice = null, legacyPrices = []) {
  if (Array.isArray(rawAlerts) && rawAlerts.length) {
    return rawAlerts
      .map((item) => {
        const price = normalizePrice(item?.price);
        if (price === null) return null;
        return {
          id: item?.id || `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          price,
        };
      })
      .filter(Boolean);
  }
  if (Array.isArray(legacyPrices) && legacyPrices.length) {
    return legacyPrices
      .map((price) => normalizePrice(price))
      .filter((price) => price !== null)
      .map((price) => ({
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        price,
      }));
  }
  const legacy = normalizePrice(legacyPrice);
  return legacy === null
    ? []
    : [{ id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, price: legacy }];
}

function normalizeWatchlist(watchlist) {
  return watchlist.map((item) => ({
    ...item,
    alerts: normalizeAlerts(item.alerts, item.alertPrice, item.alertPrices),
  }));
}

function getPriceSide(currentPrice, targetPrice) {
  if (currentPrice === null || currentPrice === undefined) return "unknown";
  if (Number(currentPrice).toFixed(2) === Number(targetPrice).toFixed(2)) return "hit";
  return currentPrice > targetPrice ? "above" : "below";
}

function inferSecid(symbol) {
  if (!symbol) return null;
  if (symbol.startsWith("6") || symbol.startsWith("9")) return `1.${symbol}`;
  if (symbol.startsWith("0") || symbol.startsWith("3")) return `0.${symbol}`;
  return null;
}

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`行情请求失败: ${resp.status}`);
  return resp.json();
}

async function fetchIndexQuotes() {
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f4,f12,f14&secids=${encodeURIComponent(
    INDEX_SYMBOLS.map((item) => item.secid).join(",")
  )}&ut=${EASTMONEY_UT}&np=1&pi=0&pz=${INDEX_SYMBOLS.length}`;
  const data = await fetchJson(url);
  const result = data?.data?.diff || [];
  const mapped = {};
  result.forEach((item) => {
    const symbol = /^\d+$/.test(String(item.f12))
      ? `${item.f12}${item.f12.startsWith("399") ? ".SZ" : ".SS"}`
      : item.f12;
    mapped[symbol] = {
      symbol,
      name: item.f14 || symbol,
      price: normalizePrice(item.f2),
      change: normalizePrice(item.f4),
      changePercent: normalizePrice(item.f3),
      currency: "CNY",
    };
  });
  return mapped;
}

async function fetchWatchlistQuotes(watchlist) {
  const secids = watchlist
    .map((item) => item.secid || inferSecid(item.symbol))
    .filter(Boolean);
  if (!secids.length) return {};
  const url = `https://push2.eastmoney.com/api/qt/ulist/get?secids=${encodeURIComponent(
    secids.join(",")
  )}&fields=f12,f14,f2,f3,f4&ut=${EASTMONEY_UT}&fltt=2&invt=2&np=1&pi=0&pz=${secids.length}`;
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
      currency: "CNY",
    };
  });
  return mapped;
}

async function notifyTargetHit(item, quote, alert) {
  const notificationId = `target-${item.symbol}-${alert.id}-${Date.now()}`;
  const notificationMap = await loadNotificationMap();
  notificationMap[notificationId] = { symbol: item.symbol, alertId: alert.id };
  await saveNotificationMap(notificationMap);

  await chrome.notifications.create(notificationId, {
    type: "basic",
    title: `${item.name || item.symbol} 价格已到目标价`,
    message: `现价 ${quote.price?.toFixed(2) || "--"}，目标价 ${alert.price.toFixed(2)}`,
    iconUrl: DEFAULT_ICON,
    priority: 2,
    requireInteraction: true,
    buttons: [{ title: "关闭一次提醒" }, { title: "永久关闭提醒" }],
  });
}

async function removeNotificationMetadata(notificationId) {
  const notificationMap = await loadNotificationMap();
  if (!notificationMap[notificationId]) return;
  delete notificationMap[notificationId];
  await saveNotificationMap(notificationMap);
}

async function permanentlyRemoveAlert(symbol, alertId) {
  const watchlist = await loadWatchlist();
  const nextWatchlist = watchlist.map((item) => {
    if (item.symbol !== symbol) return item;
    return {
      ...item,
      alerts: item.alerts.filter((alert) => alert.id !== alertId),
    };
  });
  await chrome.storage.local.set({ watchlist: nextWatchlist });

  const alertCache = await loadAlertCache();
  if (alertCache[symbol]?.targets) {
    delete alertCache[symbol].targets[alertId];
    await saveAlertCache(alertCache);
  }

  let pendingCount = 0;
  Object.values(alertCache).forEach((item) => {
    Object.values(item?.targets || {}).forEach((target) => {
      if (target?.pending) pendingCount += 1;
    });
  });
  await setBadgeCount(pendingCount);
}

async function clearPendingBadgeState() {
  const alertCache = await loadAlertCache();
  Object.values(alertCache).forEach((item) => {
    Object.values(item?.targets || {}).forEach((target) => {
      if (target) target.pending = false;
    });
  });
  await saveAlertCache(alertCache);
  await setBadgeCount(0);
}

async function checkAlerts(quotes, watchlist) {
  const cache = await loadAlertCache();
  let pendingCount = 0;
  for (const item of watchlist) {
    const quote = quotes[item.symbol];
    const nextTargets = {};
    const prevTargets = cache[item.symbol]?.targets || {};

    for (const alert of item.alerts) {
      const side = quote ? getPriceSide(quote.price, alert.price) : "unknown";
      const prevSide = prevTargets[alert.id]?.side || "unknown";
      let pending = Boolean(prevTargets[alert.id]?.pending);
      const crossed =
        quote &&
        prevSide !== "unknown" &&
        side !== prevSide &&
        !(prevSide === "hit" && side === "hit");

      if (crossed) {
        await notifyTargetHit(item, quote, alert);
        pending = true;
      }
      nextTargets[alert.id] = { side, pending };
      if (pending) pendingCount += 1;
    }

    cache[item.symbol] = { targets: nextTargets };
  }
  await saveAlertCache(cache);
  await setBadgeCount(pendingCount);
}

async function pollQuotes() {
  const watchlist = await loadWatchlist();
  const [indexQuotes, watchlistQuotes] = await Promise.all([
    fetchIndexQuotes(),
    fetchWatchlistQuotes(watchlist),
  ]);
  const quotes = { ...indexQuotes, ...watchlistQuotes };
  await saveLastQuotes(quotes);
  await checkAlerts(quotes, watchlist);
  return quotes;
}

function ensureAlarm() {
  chrome.alarms.create("quotePoll", { periodInMinutes: POLL_MINUTES });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  pollQuotes().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  pollQuotes().catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "quotePoll") {
    pollQuotes().catch(() => {});
  }
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  const notificationMap = await loadNotificationMap();
  const meta = notificationMap[notificationId];
  if (!meta) return;

  if (buttonIndex === 1) {
    await permanentlyRemoveAlert(meta.symbol, meta.alertId);
  }

  await chrome.notifications.clear(notificationId);
  await removeNotificationMetadata(notificationId);
});

chrome.notifications.onClosed.addListener((notificationId) => {
  removeNotificationMetadata(notificationId).catch(() => {});
});

chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);
  removeNotificationMetadata(notificationId).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "clearBadge") {
    clearPendingBadgeState()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message?.type === "refreshQuotes") {
    pollQuotes()
      .then((quotes) => sendResponse({ ok: true, quotes }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  return undefined;
});
