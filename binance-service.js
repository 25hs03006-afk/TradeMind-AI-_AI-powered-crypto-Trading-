import { BINANCE_CONFIG } from "./config.js";
import { safeNumber } from "./utils.js";

export class BinanceService {
  constructor() {
    this.marketSocket = null;
    this.marketReconnect = null;
    this.klineSocket = null;
    this.klineReconnect = null;
    this.activeKlineConfig = null;
  }

  async fetchTickerSnapshot(symbols) {
    const response = await fetch(
      `${BINANCE_CONFIG.restBase}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`
    );
    if (!response.ok) {
      throw new Error("Unable to load market data.");
    }

    const payload = await response.json();
    return payload.map((item) => ({
      symbol: item.symbol,
      lastPrice: safeNumber(item.lastPrice),
      priceChangePercent: safeNumber(item.priceChangePercent),
      highPrice: safeNumber(item.highPrice),
      lowPrice: safeNumber(item.lowPrice),
      volume: safeNumber(item.volume),
      quoteVolume: safeNumber(item.quoteVolume),
      weightedAvgPrice: safeNumber(item.weightedAvgPrice),
      openTime: safeNumber(item.openTime),
      closeTime: safeNumber(item.closeTime),
      count: safeNumber(item.count)
    }));
  }

  async fetchKlines(symbol, interval, limit = BINANCE_CONFIG.chartLimit) {
    const response = await fetch(
      `${BINANCE_CONFIG.restBase}/uiKlines?symbol=${symbol}&interval=${interval}&limit=${limit}&timeZone=5:30`
    );
    if (!response.ok) {
      throw new Error("Unable to load chart candles.");
    }

    const payload = await response.json();
    return payload.map((item) => ({
      openTime: item[0],
      open: safeNumber(item[1]),
      high: safeNumber(item[2]),
      low: safeNumber(item[3]),
      close: safeNumber(item[4]),
      volume: safeNumber(item[5]),
      closeTime: item[6],
      quoteVolume: safeNumber(item[7]),
      trades: safeNumber(item[8]),
      takerBuyBaseVolume: safeNumber(item[9]),
      takerBuyQuoteVolume: safeNumber(item[10])
    }));
  }

  connectMarketTicker(onMessage) {
    this.disconnectMarketTicker();
    const connect = () => {
      this.marketSocket = new WebSocket(`${BINANCE_CONFIG.wsBase}/stream?streams=!miniTicker@arr`);

      this.marketSocket.addEventListener("message", (event) => {
        const payload = JSON.parse(event.data);
        const updates = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
        const next = updates.map((item) => {
          const openPrice = safeNumber(item.o);
          const lastPrice = safeNumber(item.c);
          const priceChangePercent = openPrice ? ((lastPrice - openPrice) / openPrice) * 100 : 0;
          return {
            symbol: item.s,
            lastPrice,
            openPrice,
            highPrice: safeNumber(item.h),
            lowPrice: safeNumber(item.l),
            volume: safeNumber(item.v),
            quoteVolume: safeNumber(item.q),
            priceChangePercent,
            eventTime: safeNumber(item.E)
          };
        });
        onMessage(next);
      });

      this.marketSocket.addEventListener("close", () => {
        this.marketReconnect = window.setTimeout(connect, 3000);
      });
    };

    connect();
  }

  disconnectMarketTicker() {
    if (this.marketReconnect) {
      window.clearTimeout(this.marketReconnect);
      this.marketReconnect = null;
    }
    if (this.marketSocket) {
      this.marketSocket.close();
      this.marketSocket = null;
    }
  }

  connectKlineStream(symbol, interval, onMessage) {
    this.disconnectKlineStream();
    this.activeKlineConfig = { symbol, interval, onMessage };

    const connect = () => {
      this.klineSocket = new WebSocket(`${BINANCE_CONFIG.wsBase}/ws/${symbol.toLowerCase()}@kline_${interval}`);

      this.klineSocket.addEventListener("message", (event) => {
        const payload = JSON.parse(event.data);
        if (!payload.k) {
          return;
        }

        onMessage({
          openTime: payload.k.t,
          open: safeNumber(payload.k.o),
          high: safeNumber(payload.k.h),
          low: safeNumber(payload.k.l),
          close: safeNumber(payload.k.c),
          volume: safeNumber(payload.k.v),
          closeTime: payload.k.T,
          trades: safeNumber(payload.k.n),
          isClosed: payload.k.x
        });
      });

      this.klineSocket.addEventListener("close", () => {
        this.klineReconnect = window.setTimeout(connect, 3000);
      });
    };

    connect();
  }

  disconnectKlineStream() {
    if (this.klineReconnect) {
      window.clearTimeout(this.klineReconnect);
      this.klineReconnect = null;
    }
    if (this.klineSocket) {
      this.klineSocket.close();
      this.klineSocket = null;
    }
  }
}
