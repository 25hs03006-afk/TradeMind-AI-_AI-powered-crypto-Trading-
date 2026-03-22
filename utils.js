const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2
});

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(safeNumber(value) * factor) / factor;
}

export function formatCurrency(value, digits = 2) {
  const number = safeNumber(value);
  return `$${number.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}`;
}

export function formatPrice(value) {
  const number = safeNumber(value);
  if (number >= 1000) {
    return formatCurrency(number, 2);
  }

  if (number >= 1) {
    return formatCurrency(number, 4);
  }

  return `$${number.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  })}`;
}

export function formatPercent(value) {
  const number = safeNumber(value);
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${round(number, 2).toFixed(2)}%`;
}

export function formatCompact(value) {
  return compactFormatter.format(safeNumber(value));
}

export function formatInteger(value) {
  return numberFormatter.format(Math.round(safeNumber(value)));
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatTimeOnly(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function maskContact(value, type) {
  if (!value) {
    return "";
  }

  if (type === "phone") {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.length > 4
      ? `${"*".repeat(Math.max(0, cleaned.length - 4))}${cleaned.slice(-4)}`
      : cleaned;
  }

  const [name, domain] = value.split("@");
  if (!domain) {
    return value;
  }

  const maskedName = name.length > 2 ? `${name[0]}${"*".repeat(name.length - 2)}${name.at(-1)}` : `${name[0]}*`;
  return `${maskedName}@${domain}`;
}

export function toKlinePoint(kline) {
  return {
    time: Math.floor(safeNumber(kline.openTime) / 1000),
    open: safeNumber(kline.open),
    high: safeNumber(kline.high),
    low: safeNumber(kline.low),
    close: safeNumber(kline.close),
    volume: safeNumber(kline.volume),
    closeTime: safeNumber(kline.closeTime),
    trades: safeNumber(kline.trades)
  };
}

export function intervalToMinutes(interval) {
  const quantity = safeNumber(interval.slice(0, -1), 1);
  const unit = interval.slice(-1);

  if (unit === "m") {
    return quantity;
  }

  if (unit === "h") {
    return quantity * 60;
  }

  if (unit === "d") {
    return quantity * 60 * 24;
  }

  if (unit === "w") {
    return quantity * 60 * 24 * 7;
  }

  if (unit === "M") {
    return quantity * 60 * 24 * 30;
  }

  return quantity;
}

export async function sha256(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function symbolMeta(symbol, symbols) {
  return symbols.find((item) => item.symbol === symbol) ?? symbols[0];
}
