const { fetchAllQuotes, searchStock } = require("../../utils/market");
const { getWatchlist, setWatchlist, getPrayState, getLastQuotes, setLastQuotes, getLastUpdated } = require("../../utils/storage");
const { normalizePrice, formatPrice, formatPercent, changeClass, getMarketLabel, makeAlertId } = require("../../utils/format");

const INDEX_SYMBOLS = ["000001.SS", "399001.SZ", "399006.SZ"];

Page({
  data: {
    indexes: [],
    watchItems: [],
    quotes: {},
    lastUpdatedText: "--",
    searchKeyword: "",
    searchResults: [],
    activeTargetSymbol: null,
    targetDraft: ""
  },

  onLoad() {
    this.loadPageState();
  },

  onShow() {
    this.loadPageState();
    this.refreshQuotes();
  },

  onPullDownRefresh() {
    this.refreshQuotes().finally(() => wx.stopPullDownRefresh());
  },

  loadPageState() {
    const quotes = getLastQuotes();
    this.setData({
      quotes,
      lastUpdatedText: this.formatUpdatedTime(getLastUpdated())
    });
    this.renderIndexes(quotes);
    this.renderWatchItems(getWatchlist(), quotes);
  },

  formatUpdatedTime(timestamp) {
    if (!timestamp) return "--";
    const date = new Date(timestamp);
    const pad = (value) => String(value).padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  },

  renderIndexes(quotes) {
    const indexes = INDEX_SYMBOLS.map((symbol) => {
      const quote = quotes[symbol] || {};
      return {
        symbol,
        name: quote.name || symbol,
        priceText: formatPrice(quote.price),
        percentText: formatPercent(quote.changePercent),
        changeClass: changeClass(quote.changePercent)
      };
    });
    this.setData({ indexes });
  },

  renderWatchItems(watchlist, quotes) {
    const watchItems = watchlist.map((item) => {
      const quote = quotes[item.symbol] || {};
      const price = quote.price;
      return {
        ...item,
        market: getMarketLabel(item.symbol, item.secid),
        priceText: formatPrice(price, 3),
        percentText: formatPercent(quote.changePercent),
        changeClass: changeClass(quote.changePercent),
        alerts: item.alerts.map((alert) => ({
          ...alert,
          priceText: formatPrice(alert.price),
          hit: price !== null && price !== undefined && Number(price).toFixed(2) === Number(alert.price).toFixed(2)
        }))
      };
    });
    this.setData({ watchItems });
  },

  async refreshQuotes() {
    const watchlist = getWatchlist();
    const prayState = getPrayState();
    try {
      const quotes = await fetchAllQuotes(watchlist, prayState.fruits);
      setLastQuotes(quotes);
      getApp().globalData.lastQuotes = quotes;
      this.setData({
        quotes,
        lastUpdatedText: this.formatUpdatedTime(Date.now())
      });
      this.renderIndexes(quotes);
      this.renderWatchItems(watchlist, quotes);
    } catch (error) {
      wx.showToast({ title: error.message || "行情刷新失败", icon: "none" });
    }
  },

  onSearchInput(event) {
    const keyword = event.detail.value.trim();
    this.setData({ searchKeyword: keyword });
    clearTimeout(this.searchTimer);
    if (!keyword) {
      this.setData({ searchResults: [] });
      return;
    }
    this.searchTimer = setTimeout(async () => {
      try {
        const results = await searchStock(keyword, 8);
        this.renderSearchResults(results);
      } catch (error) {
        wx.showToast({ title: error.message || "搜索失败", icon: "none" });
      }
    }, 300);
  },

  clearSearch() {
    clearTimeout(this.searchTimer);
    this.setData({
      searchKeyword: "",
      searchResults: []
    });
  },

  renderSearchResults(results) {
    const watched = new Set(getWatchlist().map((item) => item.symbol));
    this.setData({
      searchResults: results.map((item) => ({
        symbol: item.symbol,
        name: item.name || item.shortname || item.symbol,
        secid: item.secid || "",
        market: getMarketLabel(item.symbol, item.secid),
        watched: watched.has(item.symbol)
      }))
    });
  },

  addWatch(event) {
    const symbol = event.currentTarget.dataset.symbol;
    const result = this.data.searchResults.find((item) => item.symbol === symbol);
    if (!result) return;
    const watchlist = getWatchlist();
    if (watchlist.some((item) => item.symbol === symbol)) {
      wx.showToast({ title: "已在关注列表", icon: "none" });
      return;
    }
    watchlist.unshift({
      symbol: result.symbol,
      name: result.name,
      secid: result.secid,
      alerts: []
    });
    setWatchlist(watchlist);
    this.clearSearch();
    this.renderWatchItems(watchlist, this.data.quotes);
    this.refreshQuotes();
    wx.showToast({ title: "已添加关注", icon: "success" });
  },

  removeWatch(event) {
    const symbol = event.currentTarget.dataset.symbol;
    wx.showModal({
      title: "移除自选",
      content: "确定移除这只股票？",
      success: (res) => {
        if (!res.confirm) return;
        const watchlist = getWatchlist().filter((item) => item.symbol !== symbol);
        setWatchlist(watchlist);
        this.renderWatchItems(watchlist, this.data.quotes);
      }
    });
  },

  toggleTargetEditor(event) {
    const symbol = event.currentTarget.dataset.symbol;
    const quote = this.data.quotes[symbol] || {};
    this.setData({
      activeTargetSymbol: this.data.activeTargetSymbol === symbol ? null : symbol,
      targetDraft: quote.price !== null && quote.price !== undefined ? formatPrice(quote.price) : ""
    });
  },

  onTargetDraftInput(event) {
    this.setData({ targetDraft: event.detail.value });
  },

  confirmTarget(event) {
    const symbol = event.currentTarget.dataset.symbol;
    const price = normalizePrice(this.data.targetDraft);
    if (price === null) {
      wx.showToast({ title: "请输入两位小数的目标价", icon: "none" });
      return;
    }
    const watchlist = getWatchlist();
    const stock = watchlist.find((item) => item.symbol === symbol);
    if (!stock) return;
    if (stock.alerts.some((item) => item.price === price)) {
      wx.showToast({ title: "这个目标价已经在监控中", icon: "none" });
      return;
    }
    stock.alerts.push({ id: makeAlertId(), price });
    setWatchlist(watchlist);
    this.setData({ activeTargetSymbol: null, targetDraft: "" });
    this.renderWatchItems(watchlist, this.data.quotes);
  },

  removeAlert(event) {
    const { symbol, alertId } = event.currentTarget.dataset;
    const watchlist = getWatchlist();
    const stock = watchlist.find((item) => item.symbol === symbol);
    if (!stock) return;
    stock.alerts = stock.alerts.filter((item) => item.id !== alertId);
    setWatchlist(watchlist);
    this.renderWatchItems(watchlist, this.data.quotes);
  },

  showDetail(event) {
    const symbol = event.currentTarget.dataset.symbol;
    const stock = this.data.watchItems.find((item) => item.symbol === symbol);
    if (!stock) return;
    wx.showModal({
      title: `${stock.name} ${stock.symbol}`,
      content: `现价 ${stock.priceText}\n涨跌幅 ${stock.percentText}\n市场 ${stock.market}`,
      showCancel: false
    });
  }
});
