import { RISK_PROFILES, STRATEGY_AGENTS } from "./config.js";
import { clamp, round, safeNumber, uid } from "./utils.js";

export class IndicatorEngine {
  static closes(candles) {
    return candles.map((item) => safeNumber(item.close));
  }

  static highs(candles) {
    return candles.map((item) => safeNumber(item.high));
  }

  static lows(candles) {
    return candles.map((item) => safeNumber(item.low));
  }

  static volumes(candles) {
    return candles.map((item) => safeNumber(item.volume));
  }

  static sma(values, period) {
    const result = new Array(values.length).fill(null);
    let sum = 0;

    for (let index = 0; index < values.length; index += 1) {
      sum += values[index];
      if (index >= period) {
        sum -= values[index - period];
      }
      if (index >= period - 1) {
        result[index] = sum / period;
      }
    }

    return result;
  }

  static ema(values, period) {
    const result = new Array(values.length).fill(null);
    if (values.length < period) {
      return result;
    }

    const multiplier = 2 / (period + 1);
    const seed = values.slice(0, period).reduce((total, value) => total + value, 0) / period;
    result[period - 1] = seed;

    for (let index = period; index < values.length; index += 1) {
      result[index] = values[index] * multiplier + result[index - 1] * (1 - multiplier);
    }

    return result;
  }

  static rsi(values, period = 14) {
    const result = new Array(values.length).fill(null);
    if (values.length <= period) {
      return result;
    }

    let gains = 0;
    let losses = 0;
    for (let index = 1; index <= period; index += 1) {
      const change = values[index] - values[index - 1];
      gains += Math.max(change, 0);
      losses += Math.max(-change, 0);
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;
    result[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

    for (let index = period + 1; index < values.length; index += 1) {
      const change = values[index] - values[index - 1];
      const gain = Math.max(change, 0);
      const loss = Math.max(-change, 0);
      averageGain = (averageGain * (period - 1) + gain) / period;
      averageLoss = (averageLoss * (period - 1) + loss) / period;
      result[index] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
    }

    return result;
  }

  static macd(values, fast = 12, slow = 26, signalPeriod = 9) {
    const fastEma = this.ema(values, fast);
    const slowEma = this.ema(values, slow);
    const macdLine = values.map((_, index) =>
      fastEma[index] !== null && slowEma[index] !== null ? fastEma[index] - slowEma[index] : null
    );
    const seeded = macdLine.map((value) => (value === null ? 0 : value));
    const signalLine = this.ema(seeded, signalPeriod);
    const histogram = macdLine.map((value, index) =>
      value !== null && signalLine[index] !== null ? value - signalLine[index] : null
    );
    return { macdLine, signalLine, histogram };
  }

  static atr(candles, period = 14) {
    const highs = this.highs(candles);
    const lows = this.lows(candles);
    const closes = this.closes(candles);
    const trueRanges = highs.map((high, index) => {
      if (index === 0) {
        return high - lows[index];
      }
      const previousClose = closes[index - 1];
      return Math.max(high - lows[index], Math.abs(high - previousClose), Math.abs(lows[index] - previousClose));
    });
    return this.ema(trueRanges, period);
  }

  static snapshot(candles) {
    const closes = this.closes(candles);
    const volumes = this.volumes(candles);
    const sma20 = this.sma(closes, 20);
    const sma50 = this.sma(closes, 50);
    const ema20 = this.ema(closes, 20);
    const ema50 = this.ema(closes, 50);
    const rsi14 = this.rsi(closes, 14);
    const macd = this.macd(closes);
    const atr14 = this.atr(candles, 14);
    const volumeAverage = this.sma(volumes, 20);
    const lastIndex = closes.length - 1;
    const previousIndex = Math.max(0, closes.length - 2);
    const currentClose = closes[lastIndex];
    const previousClose = closes[previousIndex];
    const momentum = previousClose ? ((currentClose - previousClose) / previousClose) * 100 : 0;
    const volatility = previousClose ? ((candles[lastIndex].high - candles[lastIndex].low) / previousClose) * 100 : 0;

    return {
      closes,
      sma20,
      sma50,
      ema20,
      ema50,
      rsi14,
      macdLine: macd.macdLine,
      signalLine: macd.signalLine,
      histogram: macd.histogram,
      atr14,
      volumeAverage,
      current: {
        close: currentClose,
        volume: volumes[lastIndex],
        rsi: rsi14[lastIndex],
        macd: macd.macdLine[lastIndex],
        macdSignal: macd.signalLine[lastIndex],
        histogram: macd.histogram[lastIndex],
        ema20: ema20[lastIndex],
        ema50: ema50[lastIndex],
        sma20: sma20[lastIndex],
        sma50: sma50[lastIndex],
        atr: atr14[lastIndex],
        volumeAverage: volumeAverage[lastIndex],
        momentum,
        volatility
      }
    };
  }
}

class StrategyAgent {
  constructor(agentConfig) {
    this.agentConfig = agentConfig;
  }

  evaluate(snapshot) {
    const current = snapshot.current;
    const price = current.close;
    const atr = current.atr || price * 0.01;
    const volumeRatio = current.volumeAverage ? current.volume / current.volumeAverage : 1;
    const trendUp = current.ema20 && current.ema50 ? current.ema20 > current.ema50 : false;
    const trendDown = current.ema20 && current.ema50 ? current.ema20 < current.ema50 : false;
    const baseConfidence = 58;

    if (this.agentConfig.id === "steady-hand") {
      if (current.rsi < 35 && trendUp) {
        return this.packageView("BUY", price, price + atr * 2.3, price - atr * 1.2, baseConfidence + 16, [
          "RSI is pressing into a value zone instead of chasing an extended move.",
          "The short-term trend is still holding above the broader trend stack."
        ]);
      }

      if (current.rsi > 68 && trendDown) {
        return this.packageView("SELL", price, price - atr * 2, price + atr * 1.1, baseConfidence + 14, [
          "The market is stretched while the trend stack leans lower.",
          "Risk remains compact with the stop placed just above the current range."
        ]);
      }
    }

    if (this.agentConfig.id === "fast-lane") {
      if (trendUp && current.macd > current.macdSignal && volumeRatio > 1.15 && current.momentum > 0) {
        return this.packageView("BUY", price, price + atr * 2.8, price - atr * 1.4, baseConfidence + 19, [
          "Momentum, MACD spread, and participation are aligned on the upside.",
          "The move still looks fresh enough for a continuation entry."
        ]);
      }

      if (trendDown && current.macd < current.macdSignal && volumeRatio > 1.15 && current.momentum < 0) {
        return this.packageView("SELL", price, price - atr * 2.6, price + atr * 1.3, baseConfidence + 18, [
          "The sell side is still in control and active volume is following through.",
          "This favors a quicker directional trade while pressure stays intact."
        ]);
      }
    }

    if (this.agentConfig.id === "chart-room") {
      if (current.rsi < 45 && current.macd > current.macdSignal && trendUp) {
        return this.packageView("BUY", price, price + atr * 2.2, price - atr * 1.1, baseConfidence + 12, [
          "MACD has turned higher while RSI still leaves room for expansion.",
          "Price is being held by the moving-average stack instead of losing it."
        ]);
      }

      if (current.rsi > 55 && current.macd < current.macdSignal && trendDown) {
        return this.packageView("SELL", price, price - atr * 2.2, price + atr * 1.1, baseConfidence + 12, [
          "Momentum has softened and the average stack points lower.",
          "RSI is not deeply oversold yet, so the move can continue."
        ]);
      }
    }

    return {
      agentId: this.agentConfig.id,
      name: this.agentConfig.name,
      stance: "WAIT",
      confidence: clamp(baseConfidence - 8, 35, 85),
      entry: price,
      takeProfit: price,
      stopLoss: price,
      reasons: [
        "The structure is mixed, so standing aside is more disciplined than forcing a trade.",
        "A clearer trend or momentum imbalance is still missing."
      ]
    };
  }

  packageView(stance, entry, takeProfit, stopLoss, confidence, reasons) {
    return {
      agentId: this.agentConfig.id,
      name: this.agentConfig.name,
      stance,
      confidence: clamp(confidence, 40, 95),
      entry: round(entry, 4),
      takeProfit: round(takeProfit, 4),
      stopLoss: round(stopLoss, 4),
      reasons
    };
  }
}

export class SignalEngine {
  constructor() {
    this.agents = STRATEGY_AGENTS.map((config) => new StrategyAgent(config));
  }

  createSignal(symbol, interval, candles, riskProfileId = RISK_PROFILES[1].id) {
    const riskProfile = RISK_PROFILES.find((item) => item.id === riskProfileId) ?? RISK_PROFILES[1];
    const snapshot = IndicatorEngine.snapshot(candles);
    const debate = this.agents.map((agent) => agent.evaluate(snapshot));
    const decision = this.judge(symbol, interval, snapshot, debate, riskProfile);

    return {
      id: uid("signal"),
      symbol,
      interval,
      riskProfile: riskProfile.id,
      createdAt: Date.now(),
      indicatorSnapshot: {
        close: round(snapshot.current.close, 4),
        rsi: round(snapshot.current.rsi, 2),
        macd: round(snapshot.current.macd, 4),
        macdSignal: round(snapshot.current.macdSignal, 4),
        ema20: round(snapshot.current.ema20, 4),
        ema50: round(snapshot.current.ema50, 4),
        atr: round(snapshot.current.atr, 4),
        volatility: round(snapshot.current.volatility, 2)
      },
      debate,
      ...decision
    };
  }

  judge(symbol, interval, snapshot, debate, riskProfile) {
    const actionable = debate.filter((view) => view.stance !== "WAIT");
    const buyVotes = actionable.filter((view) => view.stance === "BUY");
    const sellVotes = actionable.filter((view) => view.stance === "SELL");
    const chosenSide = buyVotes.length === sellVotes.length ? "WAIT" : buyVotes.length > sellVotes.length ? "BUY" : "SELL";
    const leadViews = chosenSide === "BUY" ? buyVotes : chosenSide === "SELL" ? sellVotes : [];
    const current = snapshot.current;
    const entry = current.close;
    const atr = current.atr || current.close * 0.01;
    const takeProfit = leadViews[0]?.takeProfit ?? (chosenSide === "SELL" ? entry - atr * 2.1 : entry + atr * 2.1);
    const stopLoss = leadViews[0]?.stopLoss ?? (chosenSide === "SELL" ? entry + atr * 1.2 : entry - atr * 1.2);
    const averageConfidence =
      leadViews.length > 0
        ? leadViews.reduce((total, item) => total + safeNumber(item.confidence), 0) / leadViews.length
        : debate.reduce((total, item) => total + safeNumber(item.confidence), 0) / debate.length;
    const reward = Math.abs(takeProfit - entry);
    const risk = Math.abs(entry - stopLoss) || 0.0001;
    const riskReward = reward / risk;
    const decision = chosenSide !== "WAIT" && riskReward >= riskProfile.riskRewardFloor ? chosenSide : "WAIT";
    const confidence = clamp(decision === "WAIT" ? averageConfidence - 15 : averageConfidence, 38, 94);
    const sizeHint = round((100 / entry) * riskProfile.sizeScale, 4);

    return {
      decision,
      confidence: round(confidence, 0),
      entry: round(entry, 4),
      takeProfit: round(takeProfit, 4),
      stopLoss: round(stopLoss, 4),
      riskReward: round(riskReward, 2),
      positionSizeHint: sizeHint,
      summary:
        decision === "WAIT"
          ? `${symbol} is active, but the current ${interval} setup is still too mixed for a fresh ${riskProfile.title.toLowerCase()} trade.`
          : `${symbol} shows a ${decision.toLowerCase()} setup on ${interval} with ${round(
              confidence,
              0
            )}% desk confidence and a ${round(riskReward, 2)}R reward profile.`
    };
  }
}

export class BacktestEngine {
  constructor() {
    this.strategies = {
      rsiRebound: {
        name: "RSI Rebound",
        evaluate: (index, indicators) => {
          const previous = indicators.rsi14[index - 1];
          const current = indicators.rsi14[index];
          if (previous !== null && current !== null && previous < 30 && current >= 30) {
            return "BUY";
          }
          if (previous !== null && current !== null && previous > 70 && current <= 70) {
            return "SELL";
          }
          return "WAIT";
        }
      },
      macdCross: {
        name: "MACD Cross",
        evaluate: (index, indicators) => {
          const previousSpread = indicators.macdLine[index - 1] - indicators.signalLine[index - 1];
          const currentSpread = indicators.macdLine[index] - indicators.signalLine[index];
          if (previousSpread <= 0 && currentSpread > 0) {
            return "BUY";
          }
          if (previousSpread >= 0 && currentSpread < 0) {
            return "SELL";
          }
          return "WAIT";
        }
      },
      trendStack: {
        name: "Trend Stack",
        evaluate: (index, indicators) => {
          const ema20 = indicators.ema20[index];
          const ema50 = indicators.ema50[index];
          const close = indicators.closes[index];
          if (ema20 && ema50 && close > ema20 && ema20 > ema50) {
            return "BUY";
          }
          if (ema20 && ema50 && close < ema20 && ema20 < ema50) {
            return "SELL";
          }
          return "WAIT";
        }
      }
    };
  }

  run(candles, strategyId, startingBalance = 10000) {
    const strategy = this.strategies[strategyId] ?? this.strategies.rsiRebound;
    const indicators = IndicatorEngine.snapshot(candles);
    const trades = [];
    const equityCurve = [];
    let balance = startingBalance;
    let peakBalance = balance;
    let maxDrawdown = 0;
    let position = null;

    for (let index = 50; index < candles.length; index += 1) {
      const candle = candles[index];
      const signal = strategy.evaluate(index, indicators);
      const atr = indicators.atr14[index] || candle.close * 0.01;

      if (!position && signal !== "WAIT") {
        position = {
          side: signal,
          entry: candle.close,
          openedAt: candle.openTime,
          quantity: (balance * 0.12) / candle.close,
          takeProfit: signal === "BUY" ? candle.close + atr * 2 : candle.close - atr * 2,
          stopLoss: signal === "BUY" ? candle.close - atr * 1.2 : candle.close + atr * 1.2
        };
      }

      if (position) {
        const hitStop = position.side === "BUY" ? candle.low <= position.stopLoss : candle.high >= position.stopLoss;
        const hitTarget =
          position.side === "BUY" ? candle.high >= position.takeProfit : candle.low <= position.takeProfit;
        const reverse =
          (position.side === "BUY" && signal === "SELL") || (position.side === "SELL" && signal === "BUY");

        if (hitStop || hitTarget || reverse || index === candles.length - 1) {
          const exit = hitStop ? position.stopLoss : hitTarget ? position.takeProfit : candle.close;
          const pnl =
            position.side === "BUY"
              ? (exit - position.entry) * position.quantity
              : (position.entry - exit) * position.quantity;
          balance += pnl;
          trades.push({
            id: uid("backtest-trade"),
            side: position.side,
            entry: round(position.entry, 4),
            exit: round(exit, 4),
            quantity: round(position.quantity, 6),
            pnl: round(pnl, 2),
            openedAt: position.openedAt,
            closedAt: candle.closeTime
          });
          position = null;
        }
      }

      peakBalance = Math.max(peakBalance, balance);
      maxDrawdown = Math.max(maxDrawdown, peakBalance - balance);
      equityCurve.push({
        time: Math.floor(candle.closeTime / 1000),
        value: round(balance, 2)
      });
    }

    const winners = trades.filter((trade) => trade.pnl > 0);
    const losers = trades.filter((trade) => trade.pnl <= 0);

    return {
      strategyName: strategy.name,
      startingBalance,
      endingBalance: round(balance, 2),
      netProfit: round(balance - startingBalance, 2),
      winRate: trades.length ? round((winners.length / trades.length) * 100, 2) : 0,
      maxDrawdown: round(maxDrawdown, 2),
      tradeCount: trades.length,
      avgWinner: winners.length
        ? round(winners.reduce((total, trade) => total + trade.pnl, 0) / winners.length, 2)
        : 0,
      avgLoser: losers.length ? round(losers.reduce((total, trade) => total + trade.pnl, 0) / losers.length, 2) : 0,
      equityCurve,
      trades
    };
  }
}
