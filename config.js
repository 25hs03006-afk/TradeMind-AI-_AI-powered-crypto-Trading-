export const APP_NAME = "Northstar Crypto Desk";

export const MARKET_SYMBOLS = [
  { symbol: "BTCUSDT", name: "Bitcoin", badge: "BTC", accent: "#f7931a" },
  { symbol: "ETHUSDT", name: "Ethereum", badge: "ETH", accent: "#627eea" },
  { symbol: "BNBUSDT", name: "BNB", badge: "BNB", accent: "#f3ba2f" },
  { symbol: "SOLUSDT", name: "Solana", badge: "SOL", accent: "#14f195" },
  { symbol: "XRPUSDT", name: "XRP", badge: "XRP", accent: "#23292f" },
  { symbol: "ADAUSDT", name: "Cardano", badge: "ADA", accent: "#2962ff" },
  { symbol: "DOGEUSDT", name: "Dogecoin", badge: "DOGE", accent: "#c2a633" },
  { symbol: "AVAXUSDT", name: "Avalanche", badge: "AVAX", accent: "#e84142" }
];

export const DEFAULT_SYMBOL = "BTCUSDT";
export const DEFAULT_INTERVAL = "15m";

export const TIMEFRAME_OPTIONS = [
  { label: "1 min", value: "1m" },
  { label: "5 min", value: "5m" },
  { label: "15 min", value: "15m" },
  { label: "1 hour", value: "1h" },
  { label: "4 hour", value: "4h" },
  { label: "1 day", value: "1d" }
];

export const RISK_PROFILES = [
  {
    id: "steady",
    title: "Steady",
    summary: "Tighter stops, patient entries, lower exposure.",
    riskRewardFloor: 1.5,
    sizeScale: 0.6
  },
  {
    id: "balanced",
    title: "Balanced",
    summary: "A mix of momentum and protection.",
    riskRewardFloor: 1.3,
    sizeScale: 1
  },
  {
    id: "active",
    title: "Active",
    summary: "Faster entries and wider room for trend runs.",
    riskRewardFloor: 1.1,
    sizeScale: 1.35
  }
];

export const STRATEGY_AGENTS = [
  {
    id: "steady-hand",
    name: "Steady Hand",
    style: "Protect capital first and only lean in when risk is clearly priced."
  },
  {
    id: "fast-lane",
    name: "Fast Lane",
    style: "Ride momentum early when trend, volume, and structure line up."
  },
  {
    id: "chart-room",
    name: "Chart Room",
    style: "Read moving averages, RSI, and MACD before making the call."
  }
];

export const FEATURE_GROUPS = [
  {
    group: "Access",
    items: [
      {
        id: "otp-auth",
        title: "OTP Login",
        summary: "One-time-code access with email or phone, session tracking, and masked delivery logs.",
        anchor: "auth-panel"
      },
      {
        id: "risk-profile",
        title: "Risk Profile",
        summary: "Every call adapts to steady, balanced, or active trading preferences.",
        anchor: "signals"
      }
    ]
  },
  {
    group: "Live Market",
    items: [
      {
        id: "realtime-data",
        title: "Live Binance Feed",
        summary: "Spot prices, 24-hour change, volume, and candles stream directly from Binance.",
        anchor: "dashboard"
      },
      {
        id: "graphs",
        title: "Accurate Charts",
        summary: "Candlestick, line, volume, equity, and performance charts explain both axes clearly.",
        anchor: "charts"
      },
      {
        id: "dashboard",
        title: "Market Dashboard",
        summary: "Fast glance cards for price, move, spread, session range, and liquidity.",
        anchor: "dashboard"
      },
      {
        id: "watchlist",
        title: "Watchlist",
        summary: "Personal shortlist that updates live and stays saved for each user.",
        anchor: "dashboard"
      }
    ]
  },
  {
    group: "Trading Room",
    items: [
      {
        id: "dummy-trades",
        title: "Paper Trades",
        summary: "Log mock long or short positions, auto-track P/L, and close on stop or target.",
        anchor: "trades"
      },
      {
        id: "signal-generation",
        title: "Trade Calls",
        summary: "Structured calls with entry, target, stop, confidence, and timing.",
        anchor: "signals"
      },
      {
        id: "multi-agent",
        title: "Strategy Debate",
        summary: "Three trading desks argue the setup before a final call is posted.",
        anchor: "signals"
      },
      {
        id: "trade-display",
        title: "Signal Ledger",
        summary: "Every generated call is stored, reviewable, and ready for optional chain logging.",
        anchor: "signals"
      }
    ]
  },
  {
    group: "Evaluation",
    items: [
      {
        id: "analytics",
        title: "Performance Analytics",
        summary: "Win rate, expectancy, exposure, closed P/L, and signal accuracy stay visible.",
        anchor: "analytics"
      },
      {
        id: "backtesting",
        title: "Backtesting Lab",
        summary: "Replay strategies on historical candles and compare trade outcomes.",
        anchor: "backtesting"
      },
      {
        id: "reports",
        title: "Performance Reports",
        summary: "Equity curves and scoreboards show how the desk is performing over time.",
        anchor: "analytics"
      },
      {
        id: "technical-indicators",
        title: "Indicators",
        summary: "RSI, MACD, moving averages, ATR, trend strength, and volume context stay in view.",
        anchor: "charts"
      }
    ]
  },
  {
    group: "Operations",
    items: [
      {
        id: "email-notifications",
        title: "Email Alerts",
        summary: "Signal alerts store in-app and can be routed through EmailJS when keys are provided.",
        anchor: "notifications"
      },
      {
        id: "oop",
        title: "Structured Code",
        summary: "The app is organized into service and engine classes for readable maintenance.",
        anchor: "feature-hub"
      }
    ]
  }
];

export const SUBMISSION_LINKS = [
  {
    title: "Professional README",
    href: "README.md",
    description: "Project overview, setup, disclosures, architecture, and references."
  },
  {
    title: "Slide Deck",
    href: "docs/presentation.html",
    description: "Eight-slide presentation covering problem, solution, stack, and implementation."
  },
  {
    title: "Video Script",
    href: "docs/demo-video-script.md",
    description: "Scene-by-scene walkthrough to record the required product demo."
  },
  {
    title: "Smart Contract",
    href: "contracts/TradeSignalLedger.sol",
    description: "Optional on-chain trade signal ledger for the bonus blockchain review."
  }
];

export const STORAGE_KEYS = {
  namespace: "northstar-desk",
  users: "users",
  session: "session",
  pendingOtp: "pending-otp",
  signals: "signals",
  trades: "trades",
  notifications: "notifications",
  settings: "settings"
};

export const BINANCE_CONFIG = {
  restBase: "https://api.binance.com/api/v3",
  wsBase: "wss://data-stream.binance.vision",
  chartLimit: 320
};

export const EMAIL_CONFIG = {
  serviceId: "",
  templateId: "",
  publicKey: ""
};

export const BLOCKCHAIN_CONFIG = {
  chainName: "Sepolia",
  contractAddress: "",
  abi: [
    "function recordSignal(string memory signalId,string memory symbol,string memory direction,uint256 entry,uint256 takeProfit,uint256 stopLoss,uint256 confidence,uint256 createdAt) external"
  ]
};
