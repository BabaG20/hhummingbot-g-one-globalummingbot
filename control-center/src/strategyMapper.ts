import type { BotConfig } from "./domain";
import { DEFAULT_PAPER_BALANCES, getPaperConnector } from "./paperTrading";

export interface HummingbotSimplePmmConfig {
  script_file_name: "simple_pmm.py";
  controllers_config: string[];
  exchange: string;
  trading_pair: string;
  order_amount: number | null;
  bid_spread: number;
  ask_spread: number;
  order_refresh_time: number;
  price_type: "mid";
}
export interface PaperClientConfigDraft {
  paper_trade_exchanges: string[];
  paper_trade_account_balance: Record<string, number>;
}
export interface StrategyMappingResult {
  supported: boolean;
  readyForEngine: false;
  strategyName: string;
  config: HummingbotSimplePmmConfig | null;
  paperClientConfig: PaperClientConfigDraft | null;
  warnings: string[];
}
/** Maps directly to the SimplePMMConfig fields in scripts/simple_pmm.py. */
export function mapBotToHummingbotConfig(bot: BotConfig, referencePrice?: number): StrategyMappingResult {
  if (bot.strategy !== "Simple PMM") return {
    supported: false, readyForEngine: false, strategyName: bot.strategy,
    config: null, paperClientConfig: null,
    warnings: ["This saved demo strategy is not the supported Hummingbot V2 simple_pmm script. Select Simple PMM to create a Hummingbot-compatible configuration."],
  };
  const parameters = bot.parameters;
  if (!parameters) return {
    supported: true, readyForEngine: false, strategyName: "simple_pmm",
    config: null, paperClientConfig: null,
    warnings: ["Bot parameters are missing. Open the bot editor and save its settings first."],
  };
  const connector = getPaperConnector(bot.paperTradeConnector);
  const orderAmount = Number.isFinite(referencePrice) && (referencePrice ?? 0) > 0
    ? Number((parameters.orderSizeUsd / (referencePrice as number)).toFixed(8))
    : null;
  const config = connector ? {
    script_file_name: "simple_pmm.py" as const,
    controllers_config: [],
    exchange: connector.value,
    trading_pair: bot.pair,
    order_amount: orderAmount,
    bid_spread: parameters.bidAskSpreadPercent / 100,
    ask_spread: parameters.bidAskSpreadPercent / 100,
    order_refresh_time: parameters.orderRefreshTimeSeconds,
    price_type: "mid" as const,
  } : null;
  return {
    supported: true, readyForEngine: false, strategyName: "simple_pmm",
    config,
    paperClientConfig: connector ? {
      paper_trade_exchanges: [connector.baseConnector],
      paper_trade_account_balance: { ...DEFAULT_PAPER_BALANCES },
    } : null,
    warnings: [
      ...(connector ? [] : ["Choose a Hummingbot paper connector such as binance_paper_trade."]),
      ...(orderAmount === null ? ["order_amount is unset until a fresh verified reference price is available. Hummingbot requires this value in base-asset units."] : ["order_amount is converted from the configured USD notional using the current quote price. Confirm the quote currency conversion before execution."]),
      "Bid and ask spread percentages are converted to Hummingbot decimal fractions (0.4% becomes 0.004).",
      "The inventory target/cap and daily-loss fields in this dashboard are not fields in simple_pmm.py and are not included in the Hummingbot script config.",
      "This remains a configuration preview. No Hummingbot process is started from this screen.",
    ],
  };
}
