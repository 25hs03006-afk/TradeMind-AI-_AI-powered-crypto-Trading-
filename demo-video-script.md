# Crypto Desk Demo 



## Opening Shot


"This project is Northstar Crypto Desk, a crypto trading intelligence platform built around live Binance market data, structured trade calls, paper trading, backtesting, reporting, and a separate submission handoff portal."

##  1: Main Landing Experience

`index.html`.


"The main website is focused on everyday trading use. The homepage opens into a live desk with market pulse cards, session status, and quick access to the chart room, signals, paper trades, and reports."

##  2: OTP Sign-In

 the OTP modal.


"Users can sign in with email or phone through an OTP flow. The project stores the session locally so watchlists, paper trades, alerts, and user risk settings stay attached to the active user."


- Enter name
- Choose email or phone
- Request OTP
- Use the displayed demo OTP
- Complete verification

##  3: Live Binance Dashboard

 dashboard and chart room.


"The dashboard is connected to Binance spot market data. Prices, 24-hour move, range, and volume update in real time. The watchlist is personalized and saved for each signed-in user."


- Click different market cards
- Save and remove a watchlist item
- Change the selected symbol

##  4: Accurate Charts And Indicators

 in the chart room.


"The chart room supports candlestick and line views. The X-axis represents candle open time in the user's local timezone. The Y-axis represents price in USDT for one unit of the selected coin. The lower chart uses the same X-axis and shows traded base-asset volume on the Y-axis."


- Switch timeframes
- Switch chart mode
-  RSI, MACD, EMA 20, EMA 50, and ATR indicators

##  5: Strategy Debate And Final Call

 signal room.


"Three strategy desks review the setup from different trading styles. Their perspectives are shown in a transparent conversation feed, and the final judge posts the entry, take profit, stop loss, confidence, and risk-reward profile."


- Change risk profile
- Click generate live call
- Read the final signal card
- strategy debate feed
- signal ledger history

##  6: Paper Trading

 paper trades.


"The platform supports dummy trades. A user can prefill the ticket from the latest call or enter levels manually, open a position, and then track live mark-to-market profit or loss. Trades close manually or when the live market reaches target or stop."


- Click use latest call
- Open a paper trade
- Show open positions table
- Close one trade manually if needed
- Show the closed trade journal

##  7: Backtesting

 backtesting section.


"The backtesting lab replays historical Binance candles against RSI, MACD, and trend-stack strategies. It reports ending balance, net profit, win rate, drawdown, and the simulated trade list."


- Select a strategy
- Run the backtest
- Point to the equity curve
- Point to the trade table

## 8: Performance Reports And Alerts

 analytics and alerts.


"The reporting layer summarizes open P/L, closed P/L, win rate, signal accuracy, and average trade result. Notifications are stored in-app and email routing is ready through EmailJS configuration."


- Analytics cards
- Performance curve
- Alert archive
- Email settings form

##  9: Feature Atlas And Submission Kit

 `features.html`.


"This separate interactive feature atlas maps every required feature back to the main implementation area."

 `submission.html`.


"The submission portal keeps all handoff materials out of the main website. It links to the README, slide deck, video script, smart contract, and reference trail."

## Closing Line


" Crypto Desk delivers a full crypto trading intelligence workflow in a polished web experience: live data, clear decision support, paper execution, backtesting, analytics, notifications, and submission-ready project materials."
