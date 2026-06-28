const { normalizePrice, inferSecid } = require("./format");

const EASTMONEY_UT = "b2884a393a59ad64002292a3e90d46a5";
const INDEX_SYMBOLS = [
  { symbol: "000001.SS", secid: "1.000001" },
  { symbol: "399001.SZ", secid: "0.399001" },
  { symbol: "399006.SZ", secid: "0.399006" }
];

function requestJson(url) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: "GET",
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`请求失败：${res.statusCode}`));
          return;
        }
        resolve(res.data);
      },
      fail(err) {
        reject(new Error(err.errMsg || "网络异常"));
      }
    });
  });
}

function mapQuote(item) {
  const rawCode = String(item.f12 || "");
  const symbol = /^\d+$/.test(rawCode)
    ? `${rawCode}${rawCode.startsWith("399") ? ".SZ" : rawCode.startsWith("000001") ? ".SS" : ""}`.replace(/(\.SZ|\.SS)$/, "$1")
    : rawCode;
  return {
    symbol: rawCode,
    displaySymbol: symbol,
    name: item.f14 || rawCode,
    price: normalizePrice(item.f2),
    change: normalizePrice(item.f4),
    changePercent: normalizePrice(item.f3)
  };
}

async function fetchIndexQuotes() {
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f4,f12,f14&secids=${encodeURIComponent(
    INDEX_SYMBOLS.map((item) => item.secid).join(",")
  )}&ut=${EASTMONEY_UT}&np=1&pi=0&pz=${INDEX_SYMBOLS.length}`;
  const data = await requestJson(url);
  const rows = (data && data.data && data.data.diff) || [];
  const mapped = {};
  rows.forEach((item) => {
    const quote = mapQuote(item);
    const indexSymbol = item.f12 === "399001" ? "399001.SZ" : item.f12 === "399006" ? "399006.SZ" : "000001.SS";
    mapped[indexSymbol] = {
      ...quote,
      symbol: indexSymbol
    };
  });
  return mapped;
}

async function fetchQuotes(stocks = []) {
  const secids = stocks.map((item) => item.secid || inferSecid(item.symbol)).filter(Boolean);
  if (!secids.length) return {};
  const url = `https://push2.eastmoney.com/api/qt/ulist/get?secids=${encodeURIComponent(
    secids.join(",")
  )}&fields=f12,f14,f2,f3,f4&ut=${EASTMONEY_UT}&fltt=2&invt=2&np=1&pi=0&pz=${secids.length}`;
  const data = await requestJson(url);
  const rows = (data && data.data && data.data.diff) || [];
  const mapped = {};
  rows.forEach((item) => {
    const quote = mapQuote(item);
    mapped[quote.symbol] = quote;
  });
  return mapped;
}

async function fetchAllQuotes(watchlist, offerings) {
  const [indexQuotes, watchQuotes, prayQuotes] = await Promise.all([
    fetchIndexQuotes(),
    fetchQuotes(watchlist),
    fetchQuotes(offerings.filter(Boolean))
  ]);
  return {
    ...indexQuotes,
    ...watchQuotes,
    ...prayQuotes
  };
}

async function searchStock(keyword, count = 8) {
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(
    keyword
  )}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=${count}`;
  const data = await requestJson(url);
  return (((data || {}).QuotationCodeTable || {}).Data || []).map((item) => ({
    symbol: item.Code,
    name: item.Name || item.Code,
    shortname: item.Name || item.Code,
    secid: item.QuoteID || inferSecid(item.Code)
  }));
}

module.exports = {
  fetchAllQuotes,
  fetchIndexQuotes,
  fetchQuotes,
  searchStock
};
