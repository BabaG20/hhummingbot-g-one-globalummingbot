import { DEFAULT_RISK_LIMITS, validateRiskLimits, type RiskLimits } from "./risk";

const KEY = "g-one-hummingbot-risk-limits-v1";

/** Browser-local safety preferences; not a server-side enforcement boundary. */
export function loadRiskLimits(): RiskLimits {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_RISK_LIMITS;
    const value = JSON.parse(raw) as RiskLimits;
    return validateRiskLimits(value) ? DEFAULT_RISK_LIMITS : value;
  } catch {
    return DEFAULT_RISK_LIMITS;
  }
}

export function saveRiskLimits(value: RiskLimits): boolean {
  if (validateRiskLimits(value)) return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
