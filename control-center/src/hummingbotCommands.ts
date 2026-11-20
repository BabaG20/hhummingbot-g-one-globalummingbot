import type { HummingbotSimplePmmConfig } from "./strategyMapper";

/**
 * Safe argv plans for the official Hummingbot CLI.
 * These plans do not execute processes. A trusted Hostless worker must execute
 * them with spawn("hbot", args, { shell: false }) after its own authorization.
 */
export interface HummingbotCommand {
  executable: "hbot";
  args: string[];
  purpose: "create-paper-config" | "start-paper-bot" | "read-status" | "stop-bot";
}

const PAPER_CONNECTORS = new Set(["binance_paper_trade", "kucoin_paper_trade", "kraken_paper_trade", "gate_io_paper_trade"]);

function safeConfigName(name: string): boolean {
  return /^conf_[a-zA-Z0-9_-]{1,48}\.yml$/.test(name);
}

function validNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

/** Build argv for the documented hbot create simple_pmm command. */
export function buildPaperCreateCommand(configName: string, config: HummingbotSimplePmmConfig): HummingbotCommand {
  if (!safeConfigName(configName)) throw new Error("Config name must use conf_<name>.yml with letters, numbers, _ or -.");
  if (!PAPER_CONNECTORS.has(config.exchange)) throw new Error("Only approved Hummingbot paper-trade connectors are allowed.");
  if (!/^[A-Z0-9]+-[A-Z0-9]+$/.test(config.trading_pair)) throw new Error("Trading pair format is invalid.");
  if (!validNumber(config.order_amount)) throw new Error("A fresh verified reference price is required to calculate order_amount.");
  if (!Number.isFinite(config.bid_spread) || config.bid_spread < 0 || !Number.isFinite(config.ask_spread) || config.ask_spread < 0) throw new Error("Bid and ask spreads must be finite non-negative decimal fractions.");
  if (!Number.isInteger(config.order_refresh_time) || config.order_refresh_time < 1) throw new Error("order_refresh_time must be a whole number of at least one second.");
  if (config.price_type !== "mid") throw new Error("Only the supported mid-price source is enabled in this build.");
  const set = (key: string, value: string | number): string[] => ["--set", key + "=" + String(value)];
  return {
    executable: "hbot", purpose: "create-paper-config",
    args: ["create", "simple_pmm", "--name", configName,
      ...set("exchange", config.exchange),
      ...set("trading_pair", config.trading_pair),
      ...set("order_amount", config.order_amount),
      ...set("bid_spread", config.bid_spread),
      ...set("ask_spread", config.ask_spread),
      ...set("order_refresh_time", config.order_refresh_time),
      ...set("price_type", config.price_type)],
  };
}

/** Start only the named config previously created as paper-only. */
export function buildPaperStartCommand(configName: string): HummingbotCommand {
  if (!safeConfigName(configName)) throw new Error("Invalid paper config name.");
  return { executable: "hbot", purpose: "start-paper-bot", args: ["start", configName] };
}

export function buildStatusCommand(): HummingbotCommand {
  return { executable: "hbot", purpose: "read-status", args: ["status", "--json"] };
}

export function buildStopCommand(): HummingbotCommand {
  return { executable: "hbot", purpose: "stop-bot", args: ["stop"] };
}