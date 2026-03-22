import {
  APP_NAME,
  DEFAULT_INTERVAL,
  DEFAULT_SYMBOL,
  FEATURE_GROUPS,
  MARKET_SYMBOLS,
  RISK_PROFILES,
  TIMEFRAME_OPTIONS
} from "./config.js";
import { BinanceService } from "./binance-service.js";
import { BacktestEngine, IndicatorEngine, SignalEngine } from "./engines.js";
import { AuthService, EmailService, LedgerService, NotificationService, StorageService } from "./services.js";
import { formatCompact, formatCurrency, formatDateTime, formatPercent, formatPrice, round, symbolMeta, toKlinePoint, uid } from "./utils.js";

class AppController {
  constructor() {
    this.storage = new StorageService();
    this.notificationService = new NotificationService(this.storage);
    this.authService = new AuthService(this.storage, this.notificationService);
    this.emailService = new EmailService(this.storage, this.notificationService);
    this.ledgerService = new LedgerService(this.notificationService);
    this.binanceService = new BinanceService();
    this.signalEngine = new SignalEngine();
    this.backtestEngine = new BacktestEngine();

    this.state = {
      user: this.authService.currentUser(),
      selectedSymbol: DEFAULT_SYMBOL,
      selectedInterval: DEFAULT_INTERVAL,
      chartMode: "candles",
      candles: [],
      marketMap: new Map(),
      latestSignal: null,
      latestBacktest: null
    };
  }

  init() {
    this.cacheDom();
    this.seedStaticControls();
    this.bindEvents();
    this.initCharts();
    this.renderFeaturePreview();
    this.restoreUserPreferences();
    this.renderSession();
    this.renderNotifications();
    this.renderWatchlist();
    this.renderSignalState();
    this.renderTrades();
    this.renderAnalytics();
    this.renderAlertSettings();
    this.loadMarketSnapshot();
    this.loadChartData();
    this.connectTickerStream();
    this.notificationService.subscribe((notification) => {
      this.showToast(notification.title, notification.body, notification.tone);
      this.renderNotifications();
    });
    if (!this.state.user) {
      window.setTimeout(() => this.openAuthModal(), 600);
    }
  }

  cacheDom() {
    this.dom = {
      openAuth: document.getElementById("open-auth"),
      heroOpenAuth: document.getElementById("hero-open-auth"),
      authModal: document.getElementById("auth-modal"),
      closeAuth: document.getElementById("close-auth"),
      authForm: document.getElementById("auth-form"),
      authName: document.getElementById("auth-name"),
      authContactType: document.getElementById("auth-contact-type"),
      authContactValue: document.getElementById("auth-contact-value"),
      authOtpCode: document.getElementById("auth-otp-code"),
      authFeedback: document.getElementById("auth-feedback"),
      sendOtp: document.getElementById("send-otp"),
      notificationToggle: document.getElementById("notification-toggle"),
      notificationPanel: document.getElementById("notification-panel"),
      notificationList: document.getElementById("notification-list"),
      notificationArchive: document.getElementById("notification-archive"),
      notificationCount: document.getElementById("notification-count"),
      markAlertsRead: document.getElementById("mark-alerts-read"),
      sessionName: document.getElementById("session-name"),
      sessionPill: document.getElementById("session-pill"),
      sessionCopy: document.getElementById("session-copy"),
      sessionAction: document.getElementById("session-action"),
      heroLivePrice: document.getElementById("hero-live-price"),
      heroLiveSymbol: document.getElementById("hero-live-symbol"),
      heroSignalCount: document.getElementById("hero-signal-count"),
      heroOpenPnl: document.getElementById("hero-open-pnl"),
      heroMarketStrip: document.getElementById("hero-market-strip"),
      marketGrid: document.getElementById("market-grid"),
      watchlistGrid: document.getElementById("watchlist-grid"),
      watchlistEmpty: document.getElementById("watchlist-empty"),
      symbolPicker: document.getElementById("symbol-picker"),
      selectedSymbolName: document.getElementById("selected-symbol-name"),
      timeframeControls: document.getElementById("timeframe-controls"),
      chartModeControls: document.getElementById("chart-mode-controls"),
      priceChart: document.getElementById("price-chart"),
      volumeChart: document.getElementById("volume-chart"),
      indicatorStrip: document.getElementById("indicator-strip"),
      riskProfileControls: document.getElementById("risk-profile-controls"),
      generateSignal: document.getElementById("generate-signal"),
      latestSignalCard: document.getElementById("latest-signal-card"),
      debateFeed: document.getElementById("debate-feed"),
      signalHistoryList: document.getElementById("signal-history-list"),
      logChain: document.getElementById("log-chain"),
      tradeForm: document.getElementById("trade-form"),
      paperSide: document.getElementById("paper-side"),
      paperQty: document.getElementById("paper-qty"),
      paperEntry: document.getElementById("paper-entry"),
      paperTp: document.getElementById("paper-tp"),
      paperSl: document.getElementById("paper-sl"),
      paperNotes: document.getElementById("paper-notes"),
      prefillSignal: document.getElementById("prefill-signal"),
      openTradesBody: document.getElementById("open-trades-body"),
      closedTradesBody: document.getElementById("closed-trades-body"),
      backtestStrategy: document.getElementById("backtest-strategy"),
      runBacktest: document.getElementById("run-backtest"),
      backtestBalance: document.getElementById("backtest-balance"),
      backtestProfit: document.getElementById("backtest-profit"),
      backtestWinRate: document.getElementById("backtest-win-rate"),
      backtestDrawdown: document.getElementById("backtest-drawdown"),
      backtestChart: document.getElementById("backtest-chart"),
      backtestTradesBody: document.getElementById("backtest-trades-body"),
      analyticsGrid: document.getElementById("analytics-grid"),
      reportChart: document.getElementById("report-chart"),
      alertSettingsForm: document.getElementById("alert-settings-form"),
      alertEmail: document.getElementById("alert-email"),
      emailAlertToggle: document.getElementById("email-alert-toggle"),
      featurePreviewGrid: document.getElementById("feature-preview-grid"),
      toastStack: document.getElementById("toast-stack")
    };
  }

  seedStaticControls() {
    this.dom.symbolPicker.innerHTML = MARKET_SYMBOLS.map(
      (item) => `<option value="${item.symbol}">${item.symbol} - ${item.name}</option>`
    ).join("");
    this.dom.symbolPicker.value = this.state.selectedSymbol;

    this.dom.timeframeControls.innerHTML = TIMEFRAME_OPTIONS.map(
      (option) => `
        <button class="pill-button ${option.value === this.state.selectedInterval ? "active" : ""}" type="button" data-timeframe="${option.value}">
          ${option.label}
        </button>
      `
    ).join("");

    this.dom.riskProfileControls.innerHTML = RISK_PROFILES.map(
      (profile) => `
        <button class="pill-button ${profile.id === this.currentRiskProfileId() ? "active" : ""}" type="button" data-risk-profile="${profile.id}">
          ${profile.title}
        </button>
      `
    ).join("");
  }

  bindEvents() {
    this.dom.openAuth.addEventListener("click", () => this.handleAuthPrimaryAction());
    this.dom.heroOpenAuth.addEventListener("click", () => this.openAuthModal());
    this.dom.closeAuth.addEventListener("click", () => this.closeAuthModal());
    this.dom.authModal.addEventListener("click", (event) => {
      if (event.target === this.dom.authModal) {
        this.closeAuthModal();
      }
    });
    this.dom.notificationToggle.addEventListener("click", () => {
      this.dom.notificationPanel.classList.toggle("hidden");
    });
    this.dom.markAlertsRead.addEventListener("click", () => {
      this.notificationService.markAllRead(this.state.user?.id);
      this.renderNotifications();
    });
    this.dom.sendOtp.addEventListener("click", () => this.sendOtp());
    this.dom.authForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.verifyOtp();
    });
    this.dom.sessionAction.addEventListener("click", () => this.handleSessionAction());
    this.dom.symbolPicker.addEventListener("change", (event) => {
      this.state.selectedSymbol = event.target.value;
      this.loadChartData();
      this.renderMarketBoard();
      this.renderWatchlist();
    });
    this.dom.timeframeControls.addEventListener("click", (event) => {
      const button = event.target.closest("[data-timeframe]");
      if (!button) {
        return;
      }
      this.state.selectedInterval = button.dataset.timeframe;
      this.seedStaticControls();
      this.loadChartData();
    });
    this.dom.chartModeControls.addEventListener("click", (event) => {
      const button = event.target.closest("[data-chart-mode]");
      if (!button) {
        return;
      }
      this.state.chartMode = button.dataset.chartMode;
      this.dom.chartModeControls.querySelectorAll("[data-chart-mode]").forEach((element) => {
        element.classList.toggle("active", element === button);
      });
      this.renderChartsFromCandles();
    });
    this.dom.riskProfileControls.addEventListener("click", (event) => {
      const button = event.target.closest("[data-risk-profile]");
      if (!button) {
        return;
      }
      if (!this.requireUser("Sign in to save a risk profile.")) {
        return;
      }
      this.authService.updateUser(this.state.user.id, {
        preferences: {
          riskProfile: button.dataset.riskProfile
        }
      });
      this.state.user = this.authService.currentUser();
      this.seedStaticControls();
    });
    this.dom.marketGrid.addEventListener("click", (event) => this.handleMarketInteractions(event));
    this.dom.watchlistGrid.addEventListener("click", (event) => this.handleMarketInteractions(event));
    this.dom.generateSignal.addEventListener("click", () => this.generateSignal());
    this.dom.logChain.addEventListener("click", () => this.logSignalOnChain());
    this.dom.prefillSignal.addEventListener("click", () => this.prefillPaperTradeFromSignal());
    this.dom.tradeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.openPaperTrade();
    });
    this.dom.openTradesBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-close-trade]");
      if (!button) {
        return;
      }
      this.closePaperTrade(button.dataset.closeTrade, "Closed manually");
    });
    this.dom.runBacktest.addEventListener("click", () => this.runBacktest());
    this.dom.alertSettingsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.saveAlertSettings();
    });
    window.addEventListener("resize", () => this.resizeCharts());
  }

  initCharts() {
    const sharedOptions = {
      layout: {
        background: { color: "transparent" },
        textColor: "#96a7c2"
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" }
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)"
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false
      }
    };

    this.priceChart = window.LightweightCharts.createChart(this.dom.priceChart, {
      ...sharedOptions,
      width: this.dom.priceChart.clientWidth,
      height: this.dom.priceChart.clientHeight
    });
    this.candleSeries = this.priceChart.addCandlestickSeries({
      upColor: "#4ddb8c",
      borderUpColor: "#4ddb8c",
      wickUpColor: "#4ddb8c",
      downColor: "#ff7a7a",
      borderDownColor: "#ff7a7a",
      wickDownColor: "#ff7a7a"
    });
    this.lineSeries = this.priceChart.addLineSeries({
      color: "#ffd166",
      lineWidth: 2
    });
    this.ema20Series = this.priceChart.addLineSeries({
      color: "#42d2c2",
      lineWidth: 2
    });
    this.ema50Series = this.priceChart.addLineSeries({
      color: "#f58b3b",
      lineWidth: 2
    });

    this.volumeChart = window.LightweightCharts.createChart(this.dom.volumeChart, {
      ...sharedOptions,
      width: this.dom.volumeChart.clientWidth,
      height: this.dom.volumeChart.clientHeight
    });
    this.volumeSeries = this.volumeChart.addHistogramSeries({
      priceScaleId: "",
      color: "#42d2c2",
      base: 0
    });

    this.backtestChart = window.LightweightCharts.createChart(this.dom.backtestChart, {
      ...sharedOptions,
      width: this.dom.backtestChart.clientWidth,
      height: this.dom.backtestChart.clientHeight
    });
    this.backtestSeries = this.backtestChart.addLineSeries({
      color: "#42d2c2",
      lineWidth: 2
    });

    this.reportChart = window.LightweightCharts.createChart(this.dom.reportChart, {
      ...sharedOptions,
      width: this.dom.reportChart.clientWidth,
      height: this.dom.reportChart.clientHeight
    });
    this.reportSeries = this.reportChart.addLineSeries({
      color: "#f58b3b",
      lineWidth: 2
    });
  }

  resizeCharts() {
    this.priceChart?.resize(this.dom.priceChart.clientWidth, this.dom.priceChart.clientHeight);
    this.volumeChart?.resize(this.dom.volumeChart.clientWidth, this.dom.volumeChart.clientHeight);
    this.backtestChart?.resize(this.dom.backtestChart.clientWidth, this.dom.backtestChart.clientHeight);
    this.reportChart?.resize(this.dom.reportChart.clientWidth, this.dom.reportChart.clientHeight);
  }

  openAuthModal() {
    this.dom.authModal.classList.remove("hidden");
  }

  closeAuthModal() {
    this.dom.authModal.classList.add("hidden");
  }

  handleAuthPrimaryAction() {
    if (this.state.user) {
      this.signOut();
      return;
    }
    this.openAuthModal();
  }

  handleSessionAction() {
    if (this.state.user) {
      this.signOut();
      return;
    }
    this.openAuthModal();
  }

  async sendOtp() {
    const name = this.dom.authName.value.trim();
    const contactType = this.dom.authContactType.value;
    const contactValue = this.dom.authContactValue.value.trim();
    if (!contactValue) {
      this.dom.authFeedback.textContent = "Enter an email address or phone number first.";
      return;
    }

    try {
      const delivery = await this.authService.sendOtp({ name, contactType, contactValue });
      this.dom.authFeedback.textContent = `Code sent to ${delivery.contactMask}. Demo code: ${delivery.otp}. It stays valid for five minutes.`;
    } catch (error) {
      this.dom.authFeedback.textContent = error.message;
    }
  }

  async verifyOtp() {
    try {
      await this.authService.verifyOtp(this.dom.authOtpCode.value.trim());
      this.state.user = this.authService.currentUser();
      this.restoreUserPreferences();
      this.renderSession();
      this.renderWatchlist();
      this.renderNotifications();
      this.renderAlertSettings();
      this.closeAuthModal();
    } catch (error) {
      this.dom.authFeedback.textContent = error.message;
    }
  }

  signOut() {
    this.authService.signOut();
    this.state.user = null;
    this.restoreUserPreferences();
    this.renderSession();
    this.renderWatchlist();
    this.renderSignalState();
    this.renderTrades();
    this.renderAnalytics();
    this.renderAlertSettings();
    this.showToast("Signed out", "The desk returned to preview mode.", "info");
  }

  requireUser(message) {
    if (this.state.user) {
      return true;
    }
    this.showToast("Sign in required", message, "warning");
    this.openAuthModal();
    return false;
  }

  restoreUserPreferences() {
    this.state.user = this.authService.currentUser();
    const riskProfile = this.currentRiskProfileId();
    this.dom.symbolPicker.value = this.state.selectedSymbol;
    this.seedStaticControls();
    if (riskProfile) {
      this.dom.riskProfileControls.querySelectorAll("[data-risk-profile]").forEach((button) => {
        button.classList.toggle("active", button.dataset.riskProfile === riskProfile);
      });
    }
  }

  currentRiskProfileId() {
    return this.state.user?.preferences?.riskProfile ?? RISK_PROFILES[1].id;
  }

  currentSignals() {
    if (!this.state.user) {
      return [];
    }
    const signals = this.storage.read("signals", []);
    return signals.filter((item) => item.userId === this.state.user?.id);
  }

  currentTrades() {
    if (!this.state.user) {
      return [];
    }
    const trades = this.storage.read("trades", []);
    return trades.filter((item) => item.userId === this.state.user?.id);
  }

  saveSignal(signal) {
    const nextSignal = { ...signal, userId: this.state.user.id };
    this.storage.append("signals", nextSignal, 400);
    return nextSignal;
  }

  saveTrade(trade) {
    const trades = this.storage.read("trades", []);
    this.storage.write("trades", [trade, ...trades].slice(0, 500));
  }

  updateTrade(tradeId, updater) {
    const trades = this.storage.read("trades", []);
    const next = trades.map((trade) => (trade.id === tradeId ? updater(trade) : trade));
    this.storage.write("trades", next);
  }

  async loadMarketSnapshot() {
    try {
      const snapshot = await this.binanceService.fetchTickerSnapshot(MARKET_SYMBOLS.map((item) => item.symbol));
      snapshot.forEach((item) => this.state.marketMap.set(item.symbol, item));
      this.renderMarketBoard();
      this.refreshPaperTrades();
      this.renderHeroMetrics();
    } catch (error) {
      this.showToast("Market data unavailable", error.message, "error");
    }
  }

  connectTickerStream() {
    this.binanceService.connectMarketTicker((updates) => {
      updates.forEach((item) => {
        if (this.state.marketMap.has(item.symbol)) {
          const previous = this.state.marketMap.get(item.symbol) ?? {};
          this.state.marketMap.set(item.symbol, { ...previous, ...item });
        }
      });
      this.renderMarketBoard();
      this.refreshPaperTrades();
      this.renderHeroMetrics();
    });
  }

  async loadChartData() {
    this.dom.selectedSymbolName.textContent = `${this.state.selectedSymbol} chart room`;
    try {
      const candles = await this.binanceService.fetchKlines(this.state.selectedSymbol, this.state.selectedInterval);
      this.state.candles = candles;
      this.renderChartsFromCandles();
      this.renderSignalState();
      this.connectKlineStream();
      this.setPaperEntryDefaults();
    } catch (error) {
      this.showToast("Chart data unavailable", error.message, "error");
    }
  }

  connectKlineStream() {
    this.binanceService.connectKlineStream(this.state.selectedSymbol, this.state.selectedInterval, (candle) => {
      const candles = [...this.state.candles];
      const last = candles[candles.length - 1];
      if (!last || last.openTime !== candle.openTime) {
        candles.push(candle);
      } else {
        candles[candles.length - 1] = { ...last, ...candle };
      }
      this.state.candles = candles.slice(-320);
      this.renderChartsFromCandles();
      this.setPaperEntryDefaults();
    });
  }

  renderMarketBoard() {
    const selectedSymbol = this.state.selectedSymbol;
    const watchlist = this.state.user?.preferences?.watchlist ?? [];
    this.dom.marketGrid.innerHTML = MARKET_SYMBOLS.map((item) => {
      const data = this.state.marketMap.get(item.symbol);
      if (!data) {
        return `
          <article class="market-card ${item.symbol === selectedSymbol ? "active" : ""}" data-symbol="${item.symbol}">
            <div class="market-card-head">
              <span class="symbol-pill" style="background:${item.accent}">${item.badge}</span>
              <button class="text-button" type="button" data-toggle-watch="${item.symbol}">${watchlist.includes(item.symbol) ? "Saved" : "Save"}</button>
            </div>
            <strong>${item.symbol}</strong>
            <span class="market-price">Waiting...</span>
            <div class="market-meta"><span>Loading live board</span><span>Binance</span></div>
          </article>
        `;
      }
      return `
        <article class="market-card ${item.symbol === selectedSymbol ? "active" : ""}" data-symbol="${item.symbol}">
          <div class="market-card-head">
            <span class="symbol-pill" style="background:${item.accent}">${item.badge}</span>
            <button class="text-button" type="button" data-toggle-watch="${item.symbol}">${watchlist.includes(item.symbol) ? "Saved" : "Save"}</button>
          </div>
          <strong>${item.symbol}</strong>
          <span class="market-price">${formatPrice(data.lastPrice)}</span>
          <div class="market-meta">
            <span class="${this.toneClass(data.priceChangePercent)}">${formatPercent(data.priceChangePercent)}</span>
            <span>Vol ${formatCompact(data.volume)}</span>
            <span>High ${formatPrice(data.highPrice)}</span>
            <span>Low ${formatPrice(data.lowPrice)}</span>
          </div>
        </article>
      `;
    }).join("");

    this.dom.heroMarketStrip.innerHTML = MARKET_SYMBOLS.slice(0, 4).map((item) => {
      const data = this.state.marketMap.get(item.symbol);
      return `
        <div class="market-strip-item">
          <div>
            <strong>${item.symbol}</strong>
            <small>${item.name}</small>
          </div>
          <div>
            <strong>${data ? formatPrice(data.lastPrice) : "Waiting..."}</strong>
            <small class="${data ? this.toneClass(data.priceChangePercent) : ""}">
              ${data ? formatPercent(data.priceChangePercent) : "Live feed"}
            </small>
          </div>
        </div>
      `;
    }).join("");
  }

  renderWatchlist() {
    const watchlist = this.state.user?.preferences?.watchlist ?? [];
    if (!watchlist.length) {
      this.dom.watchlistEmpty.classList.remove("hidden");
      this.dom.watchlistGrid.innerHTML = "";
      return;
    }

    this.dom.watchlistEmpty.classList.add("hidden");
    this.dom.watchlistGrid.innerHTML = watchlist.map((symbol) => {
      const meta = symbolMeta(symbol, MARKET_SYMBOLS);
      const data = this.state.marketMap.get(symbol);
      return `
        <article class="watch-item" data-symbol="${symbol}">
          <div>
            <strong>${symbol}</strong>
            <small>${meta.name}</small>
          </div>
          <div>
            <strong>${data ? formatPrice(data.lastPrice) : "Waiting..."}</strong>
            <small class="${data ? this.toneClass(data.priceChangePercent) : ""}">
              ${data ? formatPercent(data.priceChangePercent) : ""}
            </small>
          </div>
        </article>
      `;
    }).join("");
  }

  handleMarketInteractions(event) {
    const toggleWatch = event.target.closest("[data-toggle-watch]");
    if (toggleWatch) {
      event.stopPropagation();
      if (!this.requireUser("Sign in to save a watchlist.")) {
        return;
      }
      this.toggleWatchlist(toggleWatch.dataset.toggleWatch);
      return;
    }

    const card = event.target.closest("[data-symbol]");
    if (!card) {
      return;
    }
    this.state.selectedSymbol = card.dataset.symbol;
    this.dom.symbolPicker.value = this.state.selectedSymbol;
    this.loadChartData();
    this.renderMarketBoard();
    this.renderWatchlist();
  }

  toggleWatchlist(symbol) {
    const watchlist = this.state.user?.preferences?.watchlist ?? [];
    const nextWatchlist = watchlist.includes(symbol)
      ? watchlist.filter((item) => item !== symbol)
      : [...watchlist, symbol].slice(-8);
    this.authService.updateUser(this.state.user.id, {
      preferences: {
        watchlist: nextWatchlist
      }
    });
    this.state.user = this.authService.currentUser();
    this.renderWatchlist();
    this.renderMarketBoard();
  }

  renderChartsFromCandles() {
    if (!this.state.candles.length) {
      return;
    }

    const points = this.state.candles.map((candle) => toKlinePoint(candle));
    const linePoints = points.map((point) => ({ time: point.time, value: point.close }));
    const indicatorSnapshot = IndicatorEngine.snapshot(this.state.candles);
    const ema20Points = indicatorSnapshot.ema20
      .map((value, index) => (value ? { time: points[index].time, value } : null))
      .filter(Boolean);
    const ema50Points = indicatorSnapshot.ema50
      .map((value, index) => (value ? { time: points[index].time, value } : null))
      .filter(Boolean);
    const volumePoints = points.map((point) => ({
      time: point.time,
      value: point.volume,
      color: point.close >= point.open ? "rgba(77,219,140,0.55)" : "rgba(255,122,122,0.55)"
    }));

    if (this.state.chartMode === "candles") {
      this.candleSeries.setData(points);
      this.lineSeries.setData([]);
    } else {
      this.candleSeries.setData([]);
      this.lineSeries.setData(linePoints);
    }
    this.ema20Series.setData(ema20Points);
    this.ema50Series.setData(ema50Points);
    this.volumeSeries.setData(volumePoints);
    this.priceChart.timeScale().fitContent();
    this.volumeChart.timeScale().fitContent();

    this.dom.indicatorStrip.innerHTML = [
      ["RSI 14", round(indicatorSnapshot.current.rsi, 2)],
      ["MACD", round(indicatorSnapshot.current.macd, 4)],
      ["Signal", round(indicatorSnapshot.current.macdSignal, 4)],
      ["EMA 20", formatPrice(indicatorSnapshot.current.ema20)],
      ["EMA 50", formatPrice(indicatorSnapshot.current.ema50)],
      ["ATR 14", formatPrice(indicatorSnapshot.current.atr)]
    ]
      .map(
        ([label, value]) => `
          <article class="indicator-chip">
            <span>${label}</span>
            <strong>${value}</strong>
          </article>
        `
      )
      .join("");
  }

  async generateSignal() {
    if (!this.requireUser("Sign in to store trade calls and alerts.")) {
      return;
    }
    if (this.state.candles.length < 60) {
      this.showToast("Not enough data", "Wait for the chart to load before generating a call.", "warning");
      return;
    }

    const signal = this.signalEngine.createSignal(
      this.state.selectedSymbol,
      this.state.selectedInterval,
      this.state.candles,
      this.currentRiskProfileId()
    );
    const stored = this.saveSignal(signal);
    this.state.latestSignal = stored;
    this.renderSignalState();
    this.renderAnalytics();

    this.notificationService.push({
      userId: this.state.user.id,
      title: `New ${stored.symbol} call`,
      body: `${stored.summary} Entry ${formatPrice(stored.entry)}, target ${formatPrice(stored.takeProfit)}, stop ${formatPrice(stored.stopLoss)}.`,
      tone: stored.decision === "BUY" ? "success" : stored.decision === "SELL" ? "error" : "warning"
    });

    if (this.state.user.preferences.emailAlerts) {
      try {
        await this.emailService.sendSignalEmail(this.state.user, stored);
      } catch (error) {
        this.showToast("Email alert error", error.message, "error");
      }
    }
  }

  async logSignalOnChain() {
    if (!this.requireUser("Sign in to log a signal on chain.")) {
      return;
    }
    if (!this.state.latestSignal) {
      this.showToast("No signal selected", "Generate a call before sending it to the chain log.", "warning");
      return;
    }
    try {
      await this.ledgerService.recordSignal(this.state.latestSignal, this.state.user.id);
    } catch (error) {
      this.showToast("Chain logging failed", error.message, "error");
    }
  }

  renderSignalState() {
    const signals = this.currentSignals();
    this.state.latestSignal = signals[0] ?? null;
    this.dom.heroSignalCount.textContent = String(signals.length);

    if (!this.state.latestSignal) {
      this.dom.latestSignalCard.innerHTML = `
        <span class="eyebrow">No live call yet</span>
        <h3>Generate a call from the current chart.</h3>
        <p>The desk will suggest an entry, target, stop, and a plain-language summary when the setup is ready.</p>
      `;
      this.dom.debateFeed.innerHTML = `<div class="empty-state">Strategy comments will appear here after a call is generated.</div>`;
      this.dom.signalHistoryList.innerHTML = `<div class="empty-state">No stored calls yet.</div>`;
      return;
    }

    const signal = this.state.latestSignal;
    this.dom.latestSignalCard.innerHTML = `
      <span class="eyebrow">${signal.symbol} - ${signal.interval}</span>
      <h3>${signal.decision === "WAIT" ? "Stand aside" : `${signal.decision} setup`}</h3>
      <p>${signal.summary}</p>
      <div class="signal-grid">
        <div class="signal-value"><span>Entry</span><strong>${formatPrice(signal.entry)}</strong></div>
        <div class="signal-value"><span>Take Profit</span><strong>${formatPrice(signal.takeProfit)}</strong></div>
        <div class="signal-value"><span>Stop Loss</span><strong>${formatPrice(signal.stopLoss)}</strong></div>
        <div class="signal-value"><span>Confidence</span><strong>${signal.confidence}%</strong></div>
        <div class="signal-value"><span>Risk / Reward</span><strong>${signal.riskReward}R</strong></div>
        <div class="signal-value"><span>Position hint</span><strong>${signal.positionSizeHint} units / $100</strong></div>
      </div>
    `;

    this.dom.debateFeed.innerHTML = signal.debate
      .map(
        (item) => `
          <article class="message-bubble">
            <header>
              <strong>${item.name}</strong>
              <span class="status-tag ${this.statusClass(item.stance)}">${item.stance}</span>
            </header>
            <p>${item.reasons[0]}</p>
            <ul>
              <li>${item.reasons[1]}</li>
              <li>Confidence: ${item.confidence}%</li>
            </ul>
          </article>
        `
      )
      .join("");

    this.dom.signalHistoryList.innerHTML = signals
      .slice(0, 6)
      .map(
        (item) => `
          <article class="signal-history-item">
            <div>
              <strong>${item.symbol} - ${item.decision}</strong>
              <small>${formatDateTime(item.createdAt)}</small>
            </div>
            <div>
              <strong>${formatPrice(item.entry)}</strong>
              <small>${item.confidence}% confidence</small>
            </div>
          </article>
        `
      )
      .join("");
  }

  prefillPaperTradeFromSignal() {
    if (!this.state.latestSignal) {
      this.showToast("No signal available", "Generate a call before prefilling the paper ticket.", "warning");
      return;
    }
    if (this.state.latestSignal.decision === "WAIT") {
      this.showToast("Stand aside signal", "The latest call says to wait, so no ticket was prefilled.", "warning");
      return;
    }

    this.dom.paperSide.value = this.state.latestSignal.decision;
    this.dom.paperEntry.value = this.state.latestSignal.entry;
    this.dom.paperTp.value = this.state.latestSignal.takeProfit;
    this.dom.paperSl.value = this.state.latestSignal.stopLoss;
    this.dom.paperNotes.value = `Prefilled from ${this.state.latestSignal.symbol} live call`;
  }

  setPaperEntryDefaults() {
    const selectedMarket = this.state.marketMap.get(this.state.selectedSymbol);
    const price = selectedMarket?.lastPrice ?? this.state.candles.at(-1)?.close;
    if (!price) {
      return;
    }
    if (!this.dom.paperEntry.value || document.activeElement !== this.dom.paperEntry) {
      this.dom.paperEntry.value = round(price, 4);
    }
  }

  openPaperTrade() {
    if (!this.requireUser("Sign in to store paper trades and P/L.")) {
      return;
    }

    const symbol = this.state.selectedSymbol;
    const side = this.dom.paperSide.value;
    const quantity = Number(this.dom.paperQty.value);
    const entry = Number(this.dom.paperEntry.value);
    const takeProfit = Number(this.dom.paperTp.value);
    const stopLoss = Number(this.dom.paperSl.value);

    if (!quantity || !entry || !takeProfit || !stopLoss) {
      this.showToast("Trade ticket incomplete", "Fill quantity, entry, target, and stop before opening a trade.", "warning");
      return;
    }

    const trade = {
      id: uid("trade"),
      userId: this.state.user.id,
      symbol,
      side,
      quantity,
      entry,
      takeProfit,
      stopLoss,
      notes: this.dom.paperNotes.value.trim(),
      status: "OPEN",
      openedAt: Date.now(),
      sourceSignalId: this.state.latestSignal?.symbol === symbol ? this.state.latestSignal.id : null
    };

    this.saveTrade(trade);
    this.renderTrades();
    this.renderAnalytics();
    this.notificationService.push({
      userId: this.state.user.id,
      title: "Paper trade opened",
      body: `${side} ${symbol} at ${formatPrice(entry)} with target ${formatPrice(takeProfit)} and stop ${formatPrice(stopLoss)}.`,
      tone: "info"
    });
    this.dom.tradeForm.reset();
    this.dom.paperQty.value = "0.25";
    this.dom.paperSide.value = "BUY";
    this.setPaperEntryDefaults();
  }

  refreshPaperTrades() {
    if (!this.state.user) {
      this.renderHeroMetrics();
      return;
    }
    const trades = this.currentTrades();
    trades
      .filter((trade) => trade.status === "OPEN")
      .forEach((trade) => {
        const livePrice = this.state.marketMap.get(trade.symbol)?.lastPrice;
        if (!livePrice) {
          return;
        }
        const hitTarget = trade.side === "BUY" ? livePrice >= trade.takeProfit : livePrice <= trade.takeProfit;
        const hitStop = trade.side === "BUY" ? livePrice <= trade.stopLoss : livePrice >= trade.stopLoss;
        if (hitTarget) {
          this.closePaperTrade(trade.id, "Target reached", trade.takeProfit);
        } else if (hitStop) {
          this.closePaperTrade(trade.id, "Stop reached", trade.stopLoss);
        }
      });
    this.renderTrades();
    this.renderAnalytics();
    this.renderHeroMetrics();
  }

  closePaperTrade(tradeId, reason, forcedExit) {
    const trade = this.currentTrades().find((item) => item.id === tradeId);
    if (!trade || trade.status !== "OPEN") {
      return;
    }
    const livePrice = forcedExit ?? this.state.marketMap.get(trade.symbol)?.lastPrice ?? trade.entry;
    const pnl =
      trade.side === "BUY"
        ? (livePrice - trade.entry) * trade.quantity
        : (trade.entry - livePrice) * trade.quantity;

    this.updateTrade(tradeId, (item) => ({
      ...item,
      status: "CLOSED",
      closedAt: Date.now(),
      closePrice: round(livePrice, 4),
      closeReason: reason,
      pnl: round(pnl, 2)
    }));
    this.notificationService.push({
      userId: this.state.user.id,
      title: "Paper trade closed",
      body: `${trade.symbol} ${trade.side.toLowerCase()} closed at ${formatPrice(livePrice)}. ${reason}.`,
      tone: pnl >= 0 ? "success" : "error"
    });
    this.renderTrades();
    this.renderAnalytics();
  }

  renderTrades() {
    const trades = this.currentTrades();
    const openTrades = trades.filter((trade) => trade.status === "OPEN");
    const closedTrades = trades.filter((trade) => trade.status === "CLOSED");

    this.dom.openTradesBody.innerHTML = openTrades.length
      ? openTrades
          .map((trade) => {
            const live = this.state.marketMap.get(trade.symbol)?.lastPrice ?? trade.entry;
            const pnl =
              trade.side === "BUY"
                ? (live - trade.entry) * trade.quantity
                : (trade.entry - live) * trade.quantity;
            return `
              <tr>
                <td>${trade.symbol}</td>
                <td><span class="status-tag ${this.statusClass(trade.side)}">${trade.side}</span></td>
                <td>${formatPrice(trade.entry)}</td>
                <td>${formatPrice(live)}</td>
                <td class="${this.toneClass(pnl)}">${formatCurrency(pnl, 2)}</td>
                <td>
                  <div class="table-tag">
                    <span>${formatDateTime(trade.openedAt)}</span>
                    <button class="text-button" data-close-trade="${trade.id}" type="button">Close</button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="6">No open paper positions.</td></tr>`;

    this.dom.closedTradesBody.innerHTML = closedTrades.length
      ? closedTrades
          .map(
            (trade) => `
              <tr>
                <td>${trade.symbol}</td>
                <td><span class="status-tag ${this.statusClass(trade.side)}">${trade.side}</span></td>
                <td>${formatPrice(trade.entry)}</td>
                <td>${formatPrice(trade.closePrice)}</td>
                <td class="${this.toneClass(trade.pnl)}">${formatCurrency(trade.pnl, 2)}</td>
                <td>${trade.closeReason}</td>
                <td>${formatDateTime(trade.closedAt)}</td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="7">No closed paper trades yet.</td></tr>`;
  }

  runBacktest() {
    if (this.state.candles.length < 80) {
      this.showToast("Not enough history", "Load more candles before running the backtest.", "warning");
      return;
    }
    const report = this.backtestEngine.run(this.state.candles, this.dom.backtestStrategy.value);
    this.state.latestBacktest = report;
    this.dom.backtestBalance.textContent = formatCurrency(report.endingBalance, 2);
    this.dom.backtestProfit.textContent = formatCurrency(report.netProfit, 2);
    this.dom.backtestWinRate.textContent = `${report.winRate}%`;
    this.dom.backtestDrawdown.textContent = formatCurrency(report.maxDrawdown, 2);
    this.backtestSeries.setData(report.equityCurve);
    this.backtestChart.timeScale().fitContent();
    this.dom.backtestTradesBody.innerHTML = report.trades.length
      ? report.trades
          .slice(0, 12)
          .map(
            (trade) => `
              <tr>
                <td>${trade.side}</td>
                <td>${formatPrice(trade.entry)}</td>
                <td>${formatPrice(trade.exit)}</td>
                <td class="${this.toneClass(trade.pnl)}">${formatCurrency(trade.pnl, 2)}</td>
                <td>${formatDateTime(trade.openedAt)}</td>
                <td>${formatDateTime(trade.closedAt)}</td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="6">No trades were triggered in this backtest window.</td></tr>`;
  }

  renderAnalytics() {
    const trades = this.currentTrades();
    const openTrades = trades.filter((trade) => trade.status === "OPEN");
    const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
    const openPnl = openTrades.reduce((total, trade) => {
      const live = this.state.marketMap.get(trade.symbol)?.lastPrice ?? trade.entry;
      const pnl =
        trade.side === "BUY"
          ? (live - trade.entry) * trade.quantity
          : (trade.entry - live) * trade.quantity;
      return total + pnl;
    }, 0);
    const closedPnl = closedTrades.reduce((total, trade) => total + (trade.pnl ?? 0), 0);
    const winRate = closedTrades.length
      ? round((closedTrades.filter((trade) => (trade.pnl ?? 0) > 0).length / closedTrades.length) * 100, 2)
      : 0;
    const callTrades = closedTrades.filter((trade) => trade.sourceSignalId);
    const signalAccuracy = callTrades.length
      ? round((callTrades.filter((trade) => (trade.pnl ?? 0) > 0).length / callTrades.length) * 100, 2)
      : 0;
    const signals = this.currentSignals();
    const avgTrade = closedTrades.length ? closedPnl / closedTrades.length : 0;

    this.dom.analyticsGrid.innerHTML = [
      ["Open P/L", formatCurrency(openPnl, 2), "Marked against live market prices"],
      ["Closed P/L", formatCurrency(closedPnl, 2), "Realized from completed paper trades"],
      ["Win rate", `${winRate}%`, "Closed-trade winners divided by all closes"],
      ["Signal accuracy", `${signalAccuracy}%`, "Closed trades opened from stored calls"],
      ["Calls stored", String(signals.length), "Generated and stored in the signal ledger"],
      ["Average trade", formatCurrency(avgTrade, 2), "Average realized result per closed paper trade"]
    ]
      .map(
        ([label, value, meta]) => `
          <article class="metric-card">
            <span>${label}</span>
            <strong>${value}</strong>
            <small>${meta}</small>
          </article>
        `
      )
      .join("");

    const curve = [];
    let cumulative = 0;
    closedTrades
      .slice()
      .sort((a, b) => a.closedAt - b.closedAt)
      .forEach((trade) => {
        cumulative += trade.pnl ?? 0;
        curve.push({
          time: Math.floor(trade.closedAt / 1000),
          value: round(cumulative, 2)
        });
      });
    this.reportSeries.setData(curve);
    this.reportChart.timeScale().fitContent();
    this.dom.heroOpenPnl.textContent = formatCurrency(openPnl, 2);
  }

  renderNotifications() {
    const notifications = this.notificationService.all(this.state.user?.id).slice(0, 12);
    const unread = notifications.filter((item) => !item.read).length;
    this.dom.notificationCount.textContent = String(unread);
    const markup = notifications.length
      ? notifications
          .map(
            (item) => `
              <article class="notice-item">
                <h4>${item.title}</h4>
                <p>${item.body}</p>
                <small>${formatDateTime(item.createdAt)}</small>
              </article>
            `
          )
          .join("")
      : `<div class="empty-state">No alerts yet.</div>`;
    this.dom.notificationList.innerHTML = markup;
    this.dom.notificationArchive.innerHTML = markup;
  }

  renderSession() {
    if (this.state.user) {
      this.dom.sessionName.textContent = this.state.user.name;
      this.dom.sessionPill.textContent = "Signed in";
      this.dom.sessionCopy.textContent =
        "Your watchlist, stored calls, paper trades, notifications, and risk profile are now attached to this local desk.";
      this.dom.sessionAction.textContent = "Sign out";
      this.dom.openAuth.textContent = "Sign out";
    } else {
      this.dom.sessionName.textContent = "Guest mode";
      this.dom.sessionPill.textContent = "Preview only";
      this.dom.sessionCopy.textContent =
        "Market data is visible for everyone. Sign in to save watchlists, paper trades, alerts, and trade history.";
      this.dom.sessionAction.textContent = "Open sign-in";
      this.dom.openAuth.textContent = "Unlock Desk";
    }
  }

  renderHeroMetrics() {
    const data = this.state.marketMap.get(this.state.selectedSymbol);
    const lastPrice = data?.lastPrice ?? this.state.candles.at(-1)?.close ?? 0;
    this.dom.heroLivePrice.textContent = formatPrice(lastPrice);
    this.dom.heroLiveSymbol.textContent = `${this.state.selectedSymbol} live price`;
  }

  saveAlertSettings() {
    if (!this.requireUser("Sign in to store alert preferences.")) {
      return;
    }
    this.authService.updateUser(this.state.user.id, {
      preferences: {
        alertEmail: this.dom.alertEmail.value.trim(),
        emailAlerts: this.dom.emailAlertToggle.checked
      }
    });
    this.state.user = this.authService.currentUser();
    this.showToast("Alert settings saved", "Email routing preferences were updated for this user.", "success");
  }

  renderAlertSettings() {
    this.dom.alertEmail.value = this.state.user?.preferences?.alertEmail ?? "";
    this.dom.emailAlertToggle.checked = Boolean(this.state.user?.preferences?.emailAlerts);
  }

  renderFeaturePreview() {
    const previewItems = FEATURE_GROUPS.flatMap((group) => group.items).slice(0, 6);
    this.dom.featurePreviewGrid.innerHTML = previewItems
      .map(
        (item) => `
          <a class="feature-preview-card" href="index.html#${item.anchor}">
            <strong>${item.title}</strong>
            <p>${item.summary}</p>
          </a>
        `
      )
      .join("");
  }

  showToast(title, body, tone = "info") {
    const toast = document.createElement("article");
    toast.className = `toast toast-${tone}`;
    toast.innerHTML = `<strong>${title}</strong><p>${body}</p>`;
    this.dom.toastStack.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
    }, 4200);
  }

  toneClass(value) {
    if (value > 0) {
      return "positive";
    }
    if (value < 0) {
      return "negative";
    }
    return "neutral";
  }

  statusClass(value) {
    if (value === "BUY") {
      return "tag-buy";
    }
    if (value === "SELL") {
      return "tag-sell";
    }
    return "tag-wait";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.title = APP_NAME;
  const app = new AppController();
  app.init();
});
