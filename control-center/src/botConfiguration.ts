import type { BotParameters } from "./domain";
import type { RiskLimits } from "./risk";

export const DEFAULT_BOT_PARAMETERS: BotParameters = {
  orderSizeUsd: 50,
  bidAskSpreadPercent: 0.4,
  inventoryTargetPercent: 10,
  inventoryCapPercent: 20,
  dailyLossLimitUsd: 100,
};

export function validateBotParameters(value: BotParameters, global: RiskLimits): string | null {
  const fields = [value.orderSizeUsd, value.bidAskSpreadPercent, value.inventoryTargetPercent, value.inventoryCapPercent, value.dailyLossLimitUsd];
  if (!fields.every(Number.isFinite)) return "All configuration values must be valid numbers.";
  if (value.orderSizeUsd <= 0 || value.orderSizeUsd > global.maxOrderNotionalUsd) return "Order size must be greater than $0 and cannot exceed the global maximum order value.";
  if (value.bidAskSpreadPercent < global.minSpreadPercent || value.bidAskSpreadPercent > 100) return "Bid/ask spread must meet the global minimum spread and be at most 100%.";
  if (value.inventoryTargetPercent < 0 || value.inventoryTargetPercent > 100) return "Inventory target must be between 0% and 100%.";
  if (value.inventoryCapPercent <= 0 || value.inventoryCapPercent > global.maxInventoryPercent) return "Inventory cap must be above 0% and cannot exceed the global inventory limit.";
  if (value.inventoryTargetPercent > value.inventoryCapPercent) return "Inventory target cannot exceed the bot inventory cap.";
  if (value.dailyLossLimitUsd <= 0 || value.dailyLossLimitUsd > global.maxDailyLossUsd) return "Bot daily loss limit must be above $0 and cannot exceed the global daily loss limit.";
  return null;
}
