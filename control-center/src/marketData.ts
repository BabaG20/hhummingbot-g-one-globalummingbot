export interface LiveMarketTicker {
  provider: "Binance Public Spot API";
  symbol: string;
  price: number;
  changePercent24h: number;
  fetchedAt: number;
}
export interface MarketTickerResult {
  ticker: LiveMarketTicker | null;
  loading: boolean;
  error: string | null;
}
const BINANCE_API = "https://api.binance.com/api/v3/ticker/24hr";
export function toBinanceSymbol(pair: string): string | null {
  const match = /^([A-Z0-9]+)-([A-Z0-9]+)$/.exec(pair.trim().toUpperCase());
  return match ? match[1] + match[2] : null;
}
export async function fetchBinanceTicker(pair: string, signal?: AbortSignal): Promise<LiveMarketTicker> {
  const symbol = toBinanceSymbol(pair);
  if (!symbol) throw new Error("Market pair must use BASE-QUOTE format, for example BTC-USDT.");
  const response = await fetch(`${BINANCE_API}?symbol=${encodeURIComponent(symbol)}`, {
    method: "GET", cache: "no-store", signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(response.status === 429 ? "Binance rate limit reached. Retry shortly." : `Market provider returned HTTP ${response.status}.`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Market provider returned an invalid response.");
  const data = payload as { symbol?: unknown; lastPrice?: unknown; priceChangePercent?: unknown };
  const price = Number(data.lastPrice);
  const change = Number(data.priceChangePercent);
  if (data.symbol !== symbol || !Number.isFinite(price) || price <= 0 || !Number.isFinite(change)) {
    throw new Error("Market provider response failed validation.");
  }
  return { provider: "Binance Public Spot API", symbol, price, changePercent24h: change, fetchedAt: Date.now() };
}
