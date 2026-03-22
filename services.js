import { BLOCKCHAIN_CONFIG, EMAIL_CONFIG, RISK_PROFILES, STORAGE_KEYS } from "./config.js";
import { formatDateTime, formatPrice, generateOtp, maskContact, safeNumber, sha256, uid } from "./utils.js";

export class StorageService {
  constructor(namespace = STORAGE_KEYS.namespace) {
    this.namespace = namespace;
  }

  key(name) {
    return `${this.namespace}:${name}`;
  }

  read(name, fallback) {
    try {
      const raw = localStorage.getItem(this.key(name));
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  write(name, value) {
    localStorage.setItem(this.key(name), JSON.stringify(value));
    return value;
  }

  remove(name) {
    localStorage.removeItem(this.key(name));
  }

  append(name, item, limit = 300) {
    const current = this.read(name, []);
    const next = [item, ...current].slice(0, limit);
    this.write(name, next);
    return next;
  }

  update(name, updater, fallback = {}) {
    const current = this.read(name, fallback);
    const next = updater(current);
    this.write(name, next);
    return next;
  }
}

export class NotificationService {
  constructor(storage) {
    this.storage = storage;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  all(userId) {
    const notifications = this.storage.read(STORAGE_KEYS.notifications, []);
    return notifications.filter((item) => !userId || item.userId === userId || !item.userId);
  }

  push({ userId, title, body, tone = "info", meta = {} }) {
    const notification = {
      id: uid("notice"),
      userId,
      title,
      body,
      tone,
      meta,
      createdAt: Date.now(),
      read: false
    };

    this.storage.append(STORAGE_KEYS.notifications, notification, 500);
    this.listeners.forEach((listener) => listener(notification));
    return notification;
  }

  markAllRead(userId) {
    const notifications = this.storage.read(STORAGE_KEYS.notifications, []);
    const next = notifications.map((item) =>
      !userId || item.userId === userId || !item.userId ? { ...item, read: true } : item
    );
    this.storage.write(STORAGE_KEYS.notifications, next);
    return next;
  }
}

export class AuthService {
  constructor(storage, notifications) {
    this.storage = storage;
    this.notifications = notifications;
  }

  users() {
    return this.storage.read(STORAGE_KEYS.users, []);
  }

  currentSession() {
    return this.storage.read(STORAGE_KEYS.session, null);
  }

  currentUser() {
    const session = this.currentSession();
    if (!session) {
      return null;
    }

    return this.users().find((user) => user.id === session.userId) ?? null;
  }

  saveUser(user) {
    const users = this.users();
    const index = users.findIndex((item) => item.id === user.id);
    const next = [...users];

    if (index === -1) {
      next.push(user);
    } else {
      next[index] = user;
    }

    this.storage.write(STORAGE_KEYS.users, next);
    return user;
  }

  updateUser(userId, patch) {
    const user = this.users().find((item) => item.id === userId);
    if (!user) {
      return null;
    }

    const nextUser = {
      ...user,
      ...patch,
      preferences: {
        ...user.preferences,
        ...(patch.preferences ?? {})
      }
    };

    this.saveUser(nextUser);
    return nextUser;
  }

  async sendOtp({ name, contactType, contactValue }) {
    const otp = generateOtp();
    const otpHash = await sha256(`${contactType}:${contactValue}:${otp}`);
    const pending = {
      id: uid("otp"),
      name,
      contactType,
      contactValue,
      contactMask: maskContact(contactValue, contactType),
      otpHash,
      expiresAt: Date.now() + 5 * 60 * 1000,
      createdAt: Date.now()
    };

    this.storage.write(STORAGE_KEYS.pendingOtp, pending);
    this.notifications.push({
      title: "Code sent",
      body: `A one-time code was sent to ${pending.contactMask}. Demo code: ${otp}`,
      tone: "info"
    });

    return { ...pending, otp };
  }

  async verifyOtp(code) {
    const pending = this.storage.read(STORAGE_KEYS.pendingOtp, null);
    if (!pending) {
      throw new Error("Send a code first.");
    }

    if (pending.expiresAt < Date.now()) {
      this.storage.remove(STORAGE_KEYS.pendingOtp);
      throw new Error("This code expired. Please request a new one.");
    }

    const checkHash = await sha256(`${pending.contactType}:${pending.contactValue}:${code}`);
    if (checkHash !== pending.otpHash) {
      throw new Error("That code did not match.");
    }

    const existing = this.users().find(
      (user) => user.contactType === pending.contactType && user.contactValue === pending.contactValue
    );

    const user =
      existing ??
      {
        id: uid("user"),
        name: pending.name || "Desk User",
        contactType: pending.contactType,
        contactValue: pending.contactValue,
        preferences: {
          riskProfile: RISK_PROFILES[1].id,
          watchlist: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
          emailAlerts: pending.contactType === "email",
          alertEmail: pending.contactType === "email" ? pending.contactValue : ""
        },
        createdAt: Date.now()
      };

    this.saveUser(user);
    const session = {
      userId: user.id,
      token: uid("session"),
      createdAt: Date.now()
    };
    this.storage.write(STORAGE_KEYS.session, session);
    this.storage.remove(STORAGE_KEYS.pendingOtp);

    this.notifications.push({
      userId: user.id,
      title: "Desk unlocked",
      body: `${user.name}, your workspace is ready as of ${formatDateTime(Date.now())}.`,
      tone: "success"
    });

    return user;
  }

  signOut() {
    this.storage.remove(STORAGE_KEYS.session);
  }
}

export class EmailService {
  constructor(storage, notifications) {
    this.storage = storage;
    this.notifications = notifications;
  }

  async sendSignalEmail(user, signal) {
    const recipient = user?.preferences?.alertEmail;
    if (!recipient) {
      return { status: "skipped", reason: "No alert email available." };
    }

    const payload = {
      to_email: recipient,
      signal_symbol: signal.symbol,
      signal_direction: signal.decision,
      entry: formatPrice(signal.entry),
      take_profit: formatPrice(signal.takeProfit),
      stop_loss: formatPrice(signal.stopLoss),
      summary: signal.summary
    };

    if (EMAIL_CONFIG.serviceId && EMAIL_CONFIG.templateId && EMAIL_CONFIG.publicKey) {
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          service_id: EMAIL_CONFIG.serviceId,
          template_id: EMAIL_CONFIG.templateId,
          user_id: EMAIL_CONFIG.publicKey,
          template_params: payload
        })
      });

      if (!response.ok) {
        throw new Error("Email delivery failed.");
      }

      this.notifications.push({
        userId: user.id,
        title: "Email sent",
        body: `Signal update for ${signal.symbol} was sent to ${recipient}.`,
        tone: "success"
      });

      return { status: "sent" };
    }

    this.storage.update(
      STORAGE_KEYS.settings,
      (settings) => ({
        ...settings,
        emailQueue: [
          {
            id: uid("email"),
            userId: user.id,
            recipient,
            payload,
            createdAt: Date.now(),
            status: "queued"
          },
          ...(settings.emailQueue ?? [])
        ].slice(0, 50)
      }),
      { emailQueue: [] }
    );

    this.notifications.push({
      userId: user.id,
      title: "Email queued",
      body: `Signal email for ${signal.symbol} is ready. Add EmailJS keys in assets/js/config.js to send it automatically.`,
      tone: "warning"
    });

    return { status: "queued" };
  }
}

export class LedgerService {
  constructor(notifications) {
    this.notifications = notifications;
  }

  async recordSignal(signal, userId) {
    if (!BLOCKCHAIN_CONFIG.contractAddress || !window.ethereum || !window.ethers) {
      this.notifications.push({
        userId,
        title: "Chain log ready",
        body: "A smart contract is included in the repo. Add a deployed address to start writing live signal records.",
        tone: "info"
      });
      return { status: "unconfigured" };
    }

    const provider = new window.ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new window.ethers.Contract(BLOCKCHAIN_CONFIG.contractAddress, BLOCKCHAIN_CONFIG.abi, signer);
    const tx = await contract.recordSignal(
      signal.id,
      signal.symbol,
      signal.decision,
      Math.round(safeNumber(signal.entry) * 1e8),
      Math.round(safeNumber(signal.takeProfit) * 1e8),
      Math.round(safeNumber(signal.stopLoss) * 1e8),
      Math.round(safeNumber(signal.confidence) * 100),
      Math.round(signal.createdAt / 1000)
    );
    await tx.wait();

    this.notifications.push({
      userId,
      title: "Chain log saved",
      body: `Signal ${signal.symbol} was written on ${BLOCKCHAIN_CONFIG.chainName}.`,
      tone: "success"
    });

    return { status: "recorded", hash: tx.hash };
  }
}
