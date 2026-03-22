# TradeMind-AI Crypto Desk Crypto Desk

TradeMind-AI Crypto Desk Crypto Desk is a browser-first crypto trading intelligence platform built for the given hackathon problem statement. It combines live Binance spot market data, accurate charting, strategy-based trade calls, paper trading, backtesting, reporting, notifications, and a separate submission portal.

## What Is Included

- Main product site: `index.html`
- Interactive feature atlas: `features.html`
- Separate submission portal: `submission.html`
- Presentation deck: `docs/presentation.html`
- Demo video script: `docs/demo-video-script.md`
- Smart contract bonus file: `contracts/TradeSignalLedger.sol`

## Feature Coverage

1. OTP-based authentication with email or phone input and one-time-code verification flow
2. Real-time Binance spot data using official REST market endpoints and WebSocket market streams
3. Accurate candlestick, line, volume, equity, and performance charts
4. Multi-coin live dashboard with price, change, range, and volume
5. Personalized watchlist saved per signed-in user
6. Dummy trades with stored entry, target, stop, live P/L, and closure history
7. Structured trade calls with entry, take profit, and stop loss
8. Multi-agent strategy debate room with a final judge decision
9. Trade display ledger with stored signal history and optional blockchain logging hook
10. Performance analytics for open P/L, closed P/L, win rate, and signal accuracy
11. Backtesting engine for RSI, MACD, and trend-stack strategies
12. Graphical performance reports through equity and realized P/L curves
13. Notification system with in-app storage and optional email routing
14. Advanced indicators including RSI, MACD, EMA, SMA, ATR, and volume context
15. User risk profiling with steady, balanced, and active modes
16. Object-oriented code structure using service and engine classes

## Product Structure

- `index.html`: main website
- `features.html`: infographic-style linked feature page
- `submission.html`: separate handoff page for all required submission assets
- `assets/css/main.css`: main product styling
- `assets/css/features.css`: feature atlas styling
- `assets/css/submission.css`: submission portal styling
- `assets/js/config.js`: app constants, symbols, references, and integration config
- `assets/js/services.js`: storage, auth, notifications, email, and chain logging services
- `assets/js/binance-service.js`: Binance REST and WebSocket connectors
- `assets/js/engines.js`: indicators, strategy agents, judge logic, and backtesting engine
- `assets/js/app.js`: UI controller for the main product flow
- `assets/js/aux-pages.js`: rendering for the feature and submission pages

## Live Data And Chart Accuracy

- Price candles come from Binance `GET /api/v3/uiKlines`
- Real-time candle updates come from Binance `<symbol>@kline_<interval>` streams
- Market board updates come from Binance `!miniTicker@arr`
- Main chart X-axis: candle open time in the user's local timezone
- Main chart Y-axis: selected coin price in USDT
- Volume chart X-axis: candle time
- Volume chart Y-axis: traded base-asset volume per candle
- Backtest chart X-axis: candle close time
- Backtest chart Y-axis: simulated account balance in USDT
- Performance chart X-axis: trade close time
- Performance chart Y-axis: cumulative realized paper-trade P/L in USDT

## How To Run

1. Open a terminal inside the project folder.
2. Start a simple local server:

```powershell
python -m http.server 8080
```

3. Open `http://localhost:8080/index.html`
4. Use `features.html` for the feature atlas and `submission.html` for the separate submission portal.

## Authentication And Alerts

- OTP auth is implemented in-browser so the project works out of the box without external credentials.
- The demo flow stores a hashed OTP and expiry locally, then shows the generated code in the delivery log for review.
- Email alerts are wired through EmailJS. To send real emails, place your EmailJS values inside `assets/js/config.js`.

## Bonus Blockchain Logging

- `contracts/TradeSignalLedger.sol` stores signal entries on-chain.
- To enable live writes from the website, deploy the contract and add the deployed address in `assets/js/config.js`.
- The main site already includes the logging button and wallet-aware integration hook.

## Disclosures

- Third-party libraries used:
  - Binance Spot API
  - Lightweight Charts
  - Ethers.js
  - Google Fonts
  - EmailJS integration hook
- Boilerplate used: none
- UI template used: none

## Implementation Notes

- The market board and chart room are browser-native and do not need a build tool.
- User data is stored locally with `localStorage` to keep the demo self-contained.
- The debate room uses strategy agents that reason from live indicators and then route through a final judge.
- The backtesting engine follows the paper references by replaying rule-based strategies across historical crypto candles and reporting outcome metrics.

## Submission Assets

- README: `README.md`
- Feature atlas: `features.html`
- Separate submission page: `submission.html`
- Slide deck: `docs/presentation.html`
- Video walkthrough script: `docs/demo-video-script.md`
- Smart contract: `contracts/TradeSignalLedger.sol`

## References

- Binance WebSocket Streams: [developers.binance.com/docs/binance-spot-api-docs/web-socket-streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)
- Binance Market Data Endpoints: [developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints)
- Backtesting of Algorithmic Cryptocurrency Trading Strategies: [researchgate.net/publication/342096129_Backtesting_of_Algorithmic_Cryptocurrency_Trading_Strategies](https://www.researchgate.net/publication/342096129_Backtesting_of_Algorithmic_Cryptocurrency_Trading_Strategies)
- A Comparative Study Between RSI and MACD: [researchgate.net/publication/377921778_a-comparative-study-between-rsi-and-macd-to-predict-opportunities-in-cryptocurrency-market-from-2020-to-2022_1](https://www.researchgate.net/publication/377921778_a-comparative-study-between-rsi-and-macd-to-predict-opportunities-in-cryptocurrency-market-from-2020-to-2022_1)
