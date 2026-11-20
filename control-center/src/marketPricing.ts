export interface MarketPriceCalculation {
  baseAsset: string;
  quoteAsset: string;
  referencePrice: number;
  orderNotionalQuote: number;
  orderAmountBase: number;
  quoteUsdAssumption: true;
  bidPrice: number;
  askPrice: number;
}
export type MarketPriceCalculationResult =
  | { ok: true; value: MarketPriceCalculation }
  | { ok: false; error: string };

/**
 * Uses a manually entered reference price. It does not fetch a ticker or place orders.
 * Price is quote-asset units per one base-asset unit.
 */
export function calculatePmmOrderAmount(
  pair: string,
  orderSizeUsd: number,
  referencePrice: number,
  spreadPercent: number,
): MarketPriceCalculationResult {
  const match = /^([A-Z0-9]+)-([A-Z0-9]+)$/.exec(pair.trim().toUpperCase());
  if (!match) return { ok: false, error: "Trading pair must use BASE-QUOTE format, for example BTC-USDT." };
  if (!Number.isFinite(orderSizeUsd) || orderSizeUsd <= 0) return { ok: false, error: "Order size must be greater than zero." };
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) return { ok: false, error: "Enter a valid reference price greater than zero." };
  if (!Number.isFinite(spreadPercent) || spreadPercent <= 0 || spreadPercent >= 100) return { ok: false, error: "Spread must be greater than 0% and below 100%." };
  const [baseAsset, quoteAsset] = match.slice(1);
  if (!["USD", "USDT", "USDC"].includes(quoteAsset)) return { ok: false, error: `USD conversion for ${quoteAsset} is not configured. No base-asset order amount will be generated for this pair.` };
  const orderAmountBase = Number((orderSizeUsd / referencePrice).toFixed(8));
  if (!Number.isFinite(orderAmountBase) || orderAmountBase <= 0) return { ok: false, error: "Calculated base-asset amount is too small. Check the order size and price." };
  const halfSpread = spreadPercent / 100;
  return {
    ok: true,
    value: {
      baseAsset, quoteAsset, referencePrice,
      orderNotionalQuote: orderAmountBase * referencePrice,
      orderAmountBase,
      quoteUsdAssumption: true,
      bidPrice: referencePrice * (1 - halfSpread),
      askPrice: referencePrice * (1 + halfSpread),
    },
  };
}
