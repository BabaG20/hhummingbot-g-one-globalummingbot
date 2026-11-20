import type { BotConfig } from "./domain";

const STORAGE_KEY = "g-one-hummingbot-control-center";
const STORAGE_VERSION = 1;

interface StoredWorkspace {
  version: typeof STORAGE_VERSION;
  bots: BotConfig[];
  updatedAt: string;
}

function isBot(value: unknown): value is BotConfig {
  if (!value || typeof value !== "object") return false;
  const bot = value as Partial<BotConfig>;
  return typeof bot.id === "string"
    && typeof bot.name === "string"
    && typeof bot.pair === "string"
    && typeof bot.strategy === "string"
    && ["Running", "Paused", "Stopped"].includes(String(bot.state))
    && typeof bot.pnl === "number"
    && typeof bot.uptime === "string"
    && bot.tradingMode === "paper";
}

/** Browser-local demo persistence only. This is not cloud/database storage. */
export function loadBots<T extends BotConfig>(fallback: T[]): T[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const record = parsed as Partial<StoredWorkspace>;
    if (record.version !== STORAGE_VERSION || !Array.isArray(record.bots)) return fallback;
    return record.bots.every(isBot) ? record.bots as T[] : fallback;
  } catch {
    return fallback;
  }
}

export function saveBots(bots: BotConfig[]): boolean {
  try {
    const payload: StoredWorkspace = {
      version: STORAGE_VERSION,
      bots,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    // Private browsing, quota limits, or disabled storage must not break the UI.
    return false;
  }
}

export function clearLocalDemoData(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
