function normalizePrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Number(num.toFixed(2));
}

function formatPrice(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return Number(value).toFixed(digits);
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${value > 0 ? "+" : ""}${Number(value).toFixed(2)}%`;
}

function changeClass(value) {
  if (value === null || value === undefined) return "";
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "";
}

function inferSecid(symbol) {
  if (!symbol) return "";
  const code = String(symbol);
  if (/^\d{5}$/.test(code)) return `116.${code}`;
  if (/^[A-Z]/.test(code)) return `105.${code}`;
  if (code.startsWith("6") || code.startsWith("9")) return `1.${code}`;
  if (code.startsWith("0") || code.startsWith("3")) return `0.${code}`;
  return "";
}

function getMarketLabel(symbol, secid = "") {
  const code = String(symbol || "");
  const sec = String(secid || "");
  if (sec.startsWith("116.") || sec.startsWith("128.") || sec.startsWith("124.") || sec.startsWith("130.") || /^\d{5}$/.test(code)) {
    return "HK";
  }
  if (sec.startsWith("105.") || sec.startsWith("106.") || sec.startsWith("153.") || /^[A-Z]/.test(code)) {
    return "US";
  }
  if (code.endsWith(".SS") || sec.startsWith("1.") || code.startsWith("6") || code.startsWith("9")) return "SH";
  if (code.endsWith(".SZ") || sec.startsWith("0.") || code.startsWith("0") || code.startsWith("3")) return "SZ";
  return "--";
}

function makeAlertId() {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAlerts(rawAlerts = []) {
  return rawAlerts
    .map((item) => {
      const price = normalizePrice(item && item.price);
      if (price === null) return null;
      return {
        id: item.id || makeAlertId(),
        price
      };
    })
    .filter(Boolean);
}

module.exports = {
  normalizePrice,
  formatPrice,
  formatPercent,
  changeClass,
  inferSecid,
  getMarketLabel,
  makeAlertId,
  normalizeAlerts
};
