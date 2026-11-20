import type { BotParameters } from "./domain";
import { evaluatePaperOrderRisk, type RiskCheck, type RiskLimits } from "./risk";

export const DEFAULT_BOT_PARAMETERS: BotParameters = {
  orderSizeUsd: 50,
  bidAskSpreadPercent: 0.4,
  inventoryTargetPercent: 10,
  inventoryCapPercent: 20,
  dailyLossLimitUsd: 100,\n  orderRefreshTimeSeconds: 15,
};

export function validateBotParameters(value: BotParameters, global: RiskLimits): string | null {
  const fields = [value.orderSizeUsd, value.bidAskSpreadPercent, value.inventoryTargetPercent, value.inventoryCapPercent, value.dailyLossLimitUsd];
  if (!fields.every(Number.isFinite) || !Number.isFinite(value.orderRefreshTimeSeconds)) return "All configuration values must be valid numbers.";
  if (value.orderSizeUsd <= 0 || value.orderSizeUsd > global.maxOrderNotionalUsd) return "Order size must be greater than $0 and cannot exceed the global maximum order value.";
  if (value.bidAskSpreadPercent < global.minSpreadPercent || value.bidAskSpreadPercent > 100) return "Bid/ask spread must meet the global minimum spread and be at most 100%.";
  if (value.inventoryTargetPercent < 0 || value.inventoryTargetPercent > 100) return "Inventory target must be between 0% and 100%.";
  if (value.inventoryCapPercent <= 0 || value.inventoryCapPercent > global.maxInventoryPercent) return "Inventory cap must be above 0% and cannot exceed the global inventory limit.";
  if (value.inventoryTargetPercent > value.inventoryCapPercent) return "Inventory target cannot exceed the bot inventory cap.";
  if (value.dailyLossLimitUsd <= 0 || value.dailyLossLimitUsd > global.maxDailyLossUsd) return "Bot daily loss limit must be above $0 and cannot exceed the global daily loss limit.";\n  if (!Number.isInteger(value.orderRefreshTimeSeconds) || value.orderRefreshTimeSeconds < 1) return "Hummingbot order refresh time must be a whole number of at least 1 second.";
  return null;
}


/** Evaluate a hypothetical paper order against both bot-specific and workspace limits. */
export function evaluateBotPaperOrderRisk(
  parameters: BotParameters,
  global: RiskLimits,
  projectedDailyLossUsd: number,
  projectedInventoryPercent: number,
): RiskCheck[] {
  const effectiveLimits: RiskLimits = {
    maxDailyLossUsd: Math.min(global.maxDailyLossUsd, parameters.dailyLossLimitUsd),
    maxOrderNotionalUsd: Math.min(global.maxOrderNotionalUsd, parameters.orderSizeUsd),
    maxInventoryPercent: Math.min(global.maxInventoryPercent, parameters.inventoryCapPercent),
    minSpreadPercent: global.minSpreadPercent,
  };
  return evaluatePaperOrderRisk({
    orderNotionalUsd: parameters.orderSizeUsd,
    projectedDailyLossUsd,
    projectedInventoryPercent,
    spreadPercent: parameters.bidAskSpreadPercent,
  }, effectiveLimits);
}
