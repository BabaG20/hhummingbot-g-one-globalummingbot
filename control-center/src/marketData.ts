export type MarketDataProviderId = "binance" | "kraken";
export interface LiveMarketTicker {
  provider: "Binance Public Spot API" | "Kraken Public Ticker API";
  symbol: string;
  requestedPair: string;
  price: number;
  changePercent24h: number;
  fetchedAt: number;
  fallbackFrom?: string;
}
export interface MarketTickerResult {
  ticker: LiveMarketTicker | null;
  loading: boolean;
  error: string | null;
}
export interface MarketDataProviderInfo {
  id: MarketDataProviderId;
  name: string;
  role: "Primary" | "Automatic fallback";
  endpoint: string;
  credentials: "Not required";
}
export const MARKET_DATA_PROVIDERS: MarketDataProviderInfo[] = [
  { id: "binance", name: "Binance Public Spot", role: "Primary", endpoint: "api.binance.com/api/v3/ticker/24hr", credentials: "Not required" },
  { id: "kraken", name: "Kraken Public Ticker", role: "Automatic fallback", endpoint: "api.kraken.com/0/public/Ticker", credentials: "Not required" },
];
const BINANCE_API = "https://api.binance.com/api/v3/ticker/24hr";
const KRAKEN_API = "https://api.kraken.com/0/public/Ticker";
function normalizedPair(pair: string): [string, string] | null {
  const match = /^([A-Z0-9]+)-([A-Z0-9]+)$/.exec(pair.trim().toUpperCase());
  return match ? [match[1], match[2]] : null;
}
export function toBinanceSymbol(pair: string): string | null {
  const parts = normalizedPair(pair);
  return parts ? parts.join("") : null;
}
function toKrakenPair(pair: string): string | null {
  const parts = normalizedPair(pair);
  if (!parts) return null;
  const aliases: Record<string, string> = { BTC: "XBT", DOGE: "XDG" };
  return parts.map((asset) => aliases[asset] ?? asset).join("");
}
async function fetchBinanceTicker(pair: string, signal?: AbortSignal): Promise<LiveMarketTicker> {
  const symbol = toBinanceSymbol(pair);
  if (!symbol) throw new Error("Market pair must use BASE-QUOTE format, for example BTC-USDT.");
  const response = await fetch(`${BINANCE_API}?symbol=${encodeURIComponent(symbol)}`, { method: "GET", cache: "no-store", signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(response.status === 429 ? "Binance rate limit reached." : `Binance returned HTTP ${response.status}.`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Binance returned an invalid response.");
  const data = payload as { symbol?: unknown; lastPrice?: unknown; priceChangePercent?: unknown };
  const price = Number(data.lastPrice), change = Number(data.priceChangePercent);
  if (data.symbol !== symbol || !Number.isFinite(price) || price <= 0 || !Number.isFinite(change)) throw new Error("Binance response failed ticker validation.");
  return { provider: "Binance Public Spot API", symbol, requestedPair: pair.toUpperCase(), price, changePercent24h: change, fetchedAt: Date.now() };
}
async function fetchKrakenTicker(pair: string, signal?: AbortSignal): Promise<LiveMarketTicker> {
  const symbol = toKrakenPair(pair);
  if (!symbol) throw new Error("Market pair must use BASE-QUOTE format.");
  const response = await fetch(`${KRAKEN_API}?pair=${encodeURIComponent(symbol)}`, { method: "GET", cache: "no-store", signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(response.status === 429 ? "Kraken rate limit reached." : `Kraken returned HTTP ${response.status}.`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Kraken returned an invalid response.");
  const body = payload as { error?: unknown; result?: unknown };
  if (Array.isArray(body.error) && body.error.length) throw new Error(String(body.error[0]));
  if (!body.result || typeof body.result !== "object") throw new Error("Kraken did not return a ticker for this pair.");
  const entries = Object.entries(body.result as Record<string, unknown>);
  const entry = entries.find(([key]) => key !== "last") ?? entries[0];
  if (!entry || !entry[1] || typeof entry[1] !== "object") throw new Error("Kraken ticker payload is empty.");
  const data = entry[1] as { c?: unknown; o?: unknown };
  const close = Array.isArray(data.c) ? Number(data.c[0]) : NaN;
  const open = Number(data.o);
  if (!Number.isFinite(close) || close <= 0 || !Number.isFinite(open) || open <= 0) throw new Error("Kraken ticker failed price validation.");
  return { provider: "Kraken Public Ticker API", symbol: entry[0], requestedPair: pair.toUpperCase(), price: close, changePercent24h: ((close - open) / open) * 100, fetchedAt: Date.now() };
}
/** Tries the primary venue first, then Kraken. Never returns demo or stale fallback data. */
export async function fetchMarketTicker(pair: string, signal?: AbortSignal): Promise<LiveMarketTicker> {
  let primaryError: unknown;
  try { return await fetchBinanceTicker(pair, signal); }
  catch (error) {
    if (signal?.aborted) throw error;
    primaryError = error;
  }
  try {
    const ticker = await fetchKrakenTicker(pair, signal);
    return { ...ticker, fallbackFrom: primaryError instanceof Error ? primaryError.message : "Primary provider unavailable" };
  } catch (fallbackError) {
    if (signal?.aborted) throw fallbackError;
    const primaryMessage = primaryError instanceof Error ? primaryError.message : "Binance unavailable";
    const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "Kraken unavailable";
    throw new Error(`All market providers failed. Binance: ${primaryMessage} Kraken: ${fallbackMessage}`);
  }
}
