const { fetchAllQuotes, searchStock } = require("../../utils/market");
const { getWatchlist, getPrayState, setPrayState, getLastQuotes, setLastQuotes } = require("../../utils/storage");
const { formatPrice, formatPercent, changeClass, getMarketLabel } = require("../../utils/format");

const DEITY_KEYS = ["caishen", "guangong", "milefo"];
const VIDEO_BASE_URL = "";
const DEITIES = {
  caishen: {
    name: "财神爷",
    copy: "愿今日红红火火，账户长虹。",
    video: VIDEO_BASE_URL ? `${VIDEO_BASE_URL}/caishen.mp4` : ""
  },
  guangong: {
    name: "关公",
    copy: "愿持仓稳如山，关键位不破。",
    video: VIDEO_BASE_URL ? `${VIDEO_BASE_URL}/guanyu.mp4` : ""
  },
  milefo: {
    name: "弥勒佛",
    copy: "愿心态放松，回撤不慌。",
    video: VIDEO_BASE_URL ? `${VIDEO_BASE_URL}/milefo.mp4` : ""
  }
};

const BLESSINGS = [
  "愿今日红红火火，账户长虹。",
  "愿所盯皆上涨，所买皆有回响。",
  "愿开盘有喜，收盘更喜。",
  "愿热点常在，自选常红。",
  "愿趋势向上，账户向阳。",
  "愿回撤收敛，利润扩张。",
  "愿低吸有肉，高抛有度。",
  "愿每次上香，都换一次新高。",
  "愿量价齐升，收益齐来。",
  "愿浮亏退散，盈利上岸。"
];

Page({
  data: {
    prayState: null,
    deity: DEITIES.caishen,
    displayedBlessing: DEITIES.caishen.copy,
    incenseCount: 0,
    fruits: [null, null, null],
    quotes: {},
    videoPlaying: false,
    searchOpen: false,
    activeSlotIndex: null,
    searchKeyword: "",
    searchResults: []
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

  noop() {},

  loadPageState() {
    const prayState = getPrayState();
    const quotes = getLastQuotes();
    this.setData({
      prayState,
      deity: DEITIES[prayState.deity] || DEITIES.caishen,
      displayedBlessing: this.data.displayedBlessing || (DEITIES[prayState.deity] || DEITIES.caishen).copy,
      incenseCount: prayState.incenseCount,
      quotes
    });
    this.updateFruits(prayState, quotes);
  },

  updateFruits(prayState = this.data.prayState, quotes = this.data.quotes) {
    const fruits = prayState.fruits.map((item) => {
      if (!item) return null;
      const quote = quotes[item.symbol] || {};
      return {
        ...item,
        market: getMarketLabel(item.symbol, item.secid),
        priceText: formatPrice(quote.price, 3),
        percentText: formatPercent(quote.changePercent),
        changeClass: changeClass(quote.changePercent)
      };
    });
    this.setData({ fruits });
  },

  async refreshQuotes() {
    const watchlist = getWatchlist();
    const prayState = getPrayState();
    try {
      const quotes = await fetchAllQuotes(watchlist, prayState.fruits);
      setLastQuotes(quotes);
      getApp().globalData.lastQuotes = quotes;
      this.setData({ quotes });
      this.updateFruits(prayState, quotes);
    } catch (error) {
      wx.showToast({ title: error.message || "行情刷新失败", icon: "none" });
    }
  },

  switchDeity(event) {
    const step = Number(event.currentTarget.dataset.step);
    const prayState = getPrayState();
    const currentIndex = DEITY_KEYS.indexOf(prayState.deity);
    const nextKey = DEITY_KEYS[(currentIndex + step + DEITY_KEYS.length) % DEITY_KEYS.length];
    const nextState = { ...prayState, deity: nextKey };
    setPrayState(nextState);
    this.setData({
      prayState: nextState,
      deity: DEITIES[nextKey],
      displayedBlessing: DEITIES[nextKey].copy,
      videoPlaying: false
    });
  },

  burnIncense() {
    const prayState = getPrayState();
    const blessing = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
    const nextState = {
      ...prayState,
      incenseCount: prayState.incenseCount + 1
    };
    setPrayState(nextState);
    this.setData({
      prayState: nextState,
      incenseCount: nextState.incenseCount,
      displayedBlessing: blessing,
      videoPlaying: true
    });
  },

  onVideoEnded() {
    this.setData({ videoPlaying: false });
  },

  openSearch(event) {
    const activeSlotIndex = Number(event.currentTarget.dataset.index);
    this.setData({
      searchOpen: true,
      activeSlotIndex,
      searchKeyword: ""
    });
    this.renderSearchResults(getWatchlist());
  },

  closeSearch() {
    this.setData({
      searchOpen: false,
      activeSlotIndex: null,
      searchKeyword: "",
      searchResults: []
    });
  },

  onSearchInput(event) {
    const keyword = event.detail.value.trim();
    this.setData({ searchKeyword: keyword });
    clearTimeout(this.searchTimer);
    if (!keyword) {
      this.renderSearchResults(getWatchlist());
      return;
    }
    this.searchTimer = setTimeout(async () => {
      try {
        const results = await searchStock(keyword, 8);
        this.renderSearchResults(results);
      } catch (error) {
        wx.showToast({ title: error.message || "搜索失败", icon: "none" });
      }
    }, 250);
  },

  renderSearchResults(source) {
    const prayState = getPrayState();
    const offered = new Set(prayState.fruits.filter(Boolean).map((item) => item.symbol));
    this.setData({
      searchResults: source.map((item) => ({
        symbol: item.symbol,
        name: item.name || item.shortname || item.symbol,
        secid: item.secid || "",
        market: getMarketLabel(item.symbol, item.secid),
        offered: offered.has(item.symbol)
      }))
    });
  },

  addOffering(event) {
    const symbol = event.currentTarget.dataset.symbol;
    const result = this.data.searchResults.find((item) => item.symbol === symbol);
    if (!result) return;
    const prayState = getPrayState();
    if (prayState.fruits.some((item) => item && item.symbol === symbol)) {
      wx.showToast({ title: "这只已经在供位上", icon: "none" });
      return;
    }
    if (this.data.activeSlotIndex === null || prayState.fruits.filter(Boolean).length >= 3) {
      wx.showModal({
        title: "供位已满",
        content: "当前最多只能上供三只股票。"
      });
      return;
    }
    prayState.fruits[this.data.activeSlotIndex] = {
      symbol: result.symbol,
      name: result.name,
      secid: result.secid
    };
    setPrayState(prayState);
    this.setData({ prayState });
    this.updateFruits(prayState, this.data.quotes);
    this.closeSearch();
    this.refreshQuotes();
    wx.showToast({ title: "已上供", icon: "success" });
  },

  removeOffering(event) {
    const index = Number(event.currentTarget.dataset.index);
    const prayState = getPrayState();
    prayState.fruits[index] = null;
    setPrayState(prayState);
    this.setData({ prayState });
    this.updateFruits(prayState, this.data.quotes);
  }
});
