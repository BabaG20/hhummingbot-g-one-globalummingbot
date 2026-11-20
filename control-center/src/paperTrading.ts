import type { PaperTradeConnector } from "./domain";

export const PAPER_CONNECTORS: { value: PaperTradeConnector; label: string; baseConnector: string }[] = [
  { value: "binance_paper_trade", label: "Binance Paper Trade", baseConnector: "binance" },
  { value: "kucoin_paper_trade", label: "KuCoin Paper Trade", baseConnector: "kucoin" },
  { value: "kraken_paper_trade", label: "Kraken Paper Trade", baseConnector: "kraken" },
  { value: "gate_io_paper_trade", label: "Gate.io Paper Trade", baseConnector: "gate_io" },
];

export const DEFAULT_PAPER_BALANCES: Record<string, number> = {
  BTC: 1, USDT: 100000, USDC: 100000, ETH: 20, WETH: 20,
  SOL: 100, DOGE: 1000000, HBOT: 10000000,
};

export function getPaperConnector(value?: PaperTradeConnector) {
  return PAPER_CONNECTORS.find((connector) => connector.value === value) ?? null;
}
