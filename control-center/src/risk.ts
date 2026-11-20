export interface RiskLimits {
  maxDailyLossUsd: number;
  maxOrderNotionalUsd: number;
  maxInventoryPercent: number;
  minSpreadPercent: number;
}

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxDailyLossUsd: 250,
  maxOrderNotionalUsd: 500,
  maxInventoryPercent: 25,
  minSpreadPercent: 0.2,
};

export interface PaperOrderRiskInput {
  orderNotionalUsd: number;
  projectedDailyLossUsd: number;
  projectedInventoryPercent: number;
  spreadPercent: number;
}

export interface RiskCheck {
  key: keyof RiskLimits;
  passed: boolean;
  message: string;
}

/** Pure pre-trade guard for future paper-order submission. No order is submitted here. */
export function evaluatePaperOrderRisk(input: PaperOrderRiskInput, limits: RiskLimits): RiskCheck[] {
  const values = Object.values(input);
  if (values.some(value => !Number.isFinite(value) || value < 0)) {
    return [{ key: "maxOrderNotionalUsd", passed: false, message: "Risk check rejected invalid or negative order values." }];
  }
  return [
    { key: "maxOrderNotionalUsd", passed: input.orderNotionalUsd <= limits.maxOrderNotionalUsd, message: "Order notional is within the configured limit." },
    { key: "maxDailyLossUsd", passed: input.projectedDailyLossUsd <= limits.maxDailyLossUsd, message: "Projected daily loss is within the configured limit." },
    { key: "maxInventoryPercent", passed: input.projectedInventoryPercent <= limits.maxInventoryPercent, message: "Projected inventory is within the configured limit." },
    { key: "minSpreadPercent", passed: input.spreadPercent >= limits.minSpreadPercent, message: "Spread meets the configured minimum." },
  ];
}

export function validateRiskLimits(limits: RiskLimits): string | null {
  if (!Number.isFinite(limits.maxDailyLossUsd) || limits.maxDailyLossUsd <= 0 || limits.maxDailyLossUsd > 1000000) return "Maximum daily loss must be between $0.01 and $1,000,000.";
  if (!Number.isFinite(limits.maxOrderNotionalUsd) || limits.maxOrderNotionalUsd <= 0 || limits.maxOrderNotionalUsd > 1000000) return "Maximum order value must be between $0.01 and $1,000,000.";
  if (!Number.isFinite(limits.maxInventoryPercent) || limits.maxInventoryPercent <= 0 || limits.maxInventoryPercent > 100) return "Maximum inventory must be greater than 0% and at most 100%.";
  if (!Number.isFinite(limits.minSpreadPercent) || limits.minSpreadPercent < 0 || limits.minSpreadPercent > 100) return "Minimum spread must be between 0% and 100%.";
  return null;
}
