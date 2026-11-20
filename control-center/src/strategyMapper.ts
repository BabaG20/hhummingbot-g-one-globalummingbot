import type { BotConfig } from "./domain";

/**
 * Maps only fields verified against Hummingbot v2.18.0's
 * pure_market_making_config_map.py. This creates a draft, never a runnable config.
 */
export interface HummingbotPmmConfigDraft {
  strategy: "pure_market_making";
  exchange: null;
  market: string;
  bid_spread: number;
  ask_spread: number;
  order_refresh_time: null;
  order_amount: null;
  inventory_skew_enabled: true;
  inventory_target_base_pct: number;
}

export interface StrategyMappingResult {
  supported: boolean;
  readyForEngine: false;
  strategyName: string;
  config: HummingbotPmmConfigDraft | null;
  warnings: string[];
}

export function mapBotToHummingbotConfig(bot: BotConfig): StrategyMappingResult {
  if (bot.strategy !== "Pure Market Making") {
    return {
      supported: false,
      readyForEngine: false,
      strategyName: bot.strategy,
      config: null,
      warnings: [
        "This strategy has not been mapped against the pinned Hummingbot v2.18.0 source yet.",
        "No engine configuration was generated."
      ],
    };
  }

  const parameters = bot.parameters;
  if (!parameters) {
    return {
      supported: true,
      readyForEngine: false,
      strategyName: "pure_market_making",
      config: null,
      warnings: ["Bot parameters are missing. Open the bot editor and save its settings first."],
    };
  }

  return {
    supported: true,
    readyForEngine: false,
    strategyName: "pure_market_making",
    config: {
      strategy: "pure_market_making",
      exchange: null,
      market: bot.pair,
      bid_spread: parameters.bidAskSpreadPercent,
      ask_spread: parameters.bidAskSpreadPercent,
      order_refresh_time: null,
      order_amount: null,
      inventory_skew_enabled: true,
      inventory_target_base_pct: parameters.inventoryTargetPercent,
    },
    warnings: [
      "Connector is intentionally unset: select and validate a supported paper connector before engine use.",
      "order_amount is unset: the UI stores order size in USD, while Hummingbot requires base-asset quantity. A verified conversion price is required.",
      "order_refresh_time is unset because no refresh interval is configured in the current bot form.",
      "Workspace and bot risk limits are not native fields in this strategy config; backend/worker enforcement is still required.",
      "This is a schema-mapped draft only. It cannot be launched and does not submit orders."
    ],
  };
}
