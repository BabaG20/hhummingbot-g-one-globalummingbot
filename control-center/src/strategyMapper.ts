import type { BotConfig } from "./domain";
import { DEFAULT_PAPER_BALANCES, getPaperConnector } from "./paperTrading";

/**
 * Maps only fields verified against the pinned Hummingbot v2.18.0 source.
 * Output is a reviewable draft, never a runnable or connected configuration.
 */
export interface HummingbotPmmConfigDraft {
  strategy: "pure_market_making";
  exchange: string | null;
  market: string;
  bid_spread: number;
  ask_spread: number;
  order_refresh_time: null;
  order_amount: number | null;
  inventory_skew_enabled: true;
  inventory_target_base_pct: number;
}
export interface PaperClientConfigDraft {
  paper_trade_exchanges: string[];
  paper_trade_account_balance: Record<string, number>;
}
export interface StrategyMappingResult {
  supported: boolean;
  readyForEngine: false;
  strategyName: string;
  config: HummingbotPmmConfigDraft | null;
  paperClientConfig: PaperClientConfigDraft | null;
  warnings: string[];
}
export function mapBotToHummingbotConfig(bot: BotConfig, referencePrice?: number): StrategyMappingResult {
  if (bot.strategy !== "Pure Market Making") return {
    supported: false, readyForEngine: false, strategyName: bot.strategy,
    config: null, paperClientConfig: null,
    warnings: ["This strategy has not been mapped against the pinned Hummingbot v2.18.0 source yet.", "No engine configuration was generated."],
  };
  const parameters = bot.parameters;
  if (!parameters) return {
    supported: true, readyForEngine: false, strategyName: "pure_market_making",
    config: null, paperClientConfig: null,
    warnings: ["Bot parameters are missing. Open the bot editor and save its settings first."],
  };
  const connector = getPaperConnector(bot.paperTradeConnector);
  const orderAmount = Number.isFinite(referencePrice) && (referencePrice ?? 0) > 0
    ? Number((parameters.orderSizeUsd / (referencePrice as number)).toFixed(8))
    : null;
  return {
    supported: true, readyForEngine: false, strategyName: "pure_market_making",
    config: {
      strategy: "pure_market_making",
      exchange: connector?.value ?? null,
      market: bot.pair,
      bid_spread: parameters.bidAskSpreadPercent,
      ask_spread: parameters.bidAskSpreadPercent,
      order_refresh_time: null,
      order_amount: orderAmount,
      inventory_skew_enabled: true,
      inventory_target_base_pct: parameters.inventoryTargetPercent,
    },
    paperClientConfig: connector ? {
      paper_trade_exchanges: [connector.baseConnector],
      paper_trade_account_balance: { ...DEFAULT_PAPER_BALANCES },
    } : null,
    warnings: [
      ...(connector ? [] : ["Choose a paper connector. The selected paper connector is mapped to the Hummingbot strategy exchange field; its base connector is separately enabled in paper_trade_exchanges."]),
      ...(orderAmount === null ? ["order_amount is unset: enter a reference price to calculate base-asset quantity. The entered price is manual and not a live ticker."] : ["order_amount is calculated from the manually entered reference price; confirm a fresh market price before any future engine integration."]),
      "order_refresh_time is unset because no refresh interval is configured yet.",
      "Paper balances shown are Hummingbot v2.18.0 defaults; they are draft client settings, not funded exchange balances.",
      "Workspace and bot risk limits are not native fields in this strategy config; backend/worker enforcement is still required.",
      "This is a non-runnable draft. It cannot connect to an exchange or submit orders.",
    ],
  };
}
