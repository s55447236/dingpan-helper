const { normalizeAlerts } = require("./format");

const WATCHLIST_KEY = "watchlist";
const PRAY_STATE_KEY = "prayState";
const LAST_QUOTES_KEY = "lastQuotes";
const LAST_UPDATED_KEY = "lastUpdated";

function normalizeWatchlist(raw = []) {
  return raw.map((item) => ({
    symbol: item.symbol,
    name: item.name || item.symbol,
    secid: item.secid || "",
    alerts: normalizeAlerts(item.alerts || [])
  }));
}

function normalizePrayState(raw = {}) {
  const source = Array.isArray(raw.fruits) ? raw.fruits.slice(0, 3) : [];
  return {
    deity: ["caishen", "guangong", "milefo"].includes(raw.deity) ? raw.deity : "caishen",
    incenseCount: Number.isFinite(raw.incenseCount) ? raw.incenseCount : 0,
    fruits: Array.from({ length: 3 }, (_, index) => {
      const item = source[index];
      if (!item || !item.symbol) return null;
      return {
        symbol: item.symbol,
        name: item.name || item.symbol,
        secid: item.secid || ""
      };
    })
  };
}

function getWatchlist() {
  return normalizeWatchlist(wx.getStorageSync(WATCHLIST_KEY) || []);
}

function setWatchlist(watchlist) {
  wx.setStorageSync(WATCHLIST_KEY, normalizeWatchlist(watchlist));
}

function getPrayState() {
  return normalizePrayState(wx.getStorageSync(PRAY_STATE_KEY) || {});
}

function setPrayState(prayState) {
  wx.setStorageSync(PRAY_STATE_KEY, normalizePrayState(prayState));
}

function getLastQuotes() {
  return wx.getStorageSync(LAST_QUOTES_KEY) || {};
}

function setLastQuotes(quotes) {
  wx.setStorageSync(LAST_QUOTES_KEY, quotes || {});
  wx.setStorageSync(LAST_UPDATED_KEY, Date.now());
}

function getLastUpdated() {
  return wx.getStorageSync(LAST_UPDATED_KEY) || null;
}

module.exports = {
  getWatchlist,
  setWatchlist,
  getPrayState,
  setPrayState,
  getLastQuotes,
  setLastQuotes,
  getLastUpdated
};
