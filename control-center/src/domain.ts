/** Shared domain contracts for the G One Global Hummingbot Control Center.
 * These types describe the control plane; they do not imply a running engine.
 */
export type BotStatus = "Running" | "Paused" | "Stopped";
export type TradingMode = "paper";
export type BotStrategy = "Pure Market Making" | "Grid" | "Avellaneda Market Making";

export interface BotConfig {
  id: string;
  name: string;
  pair: string;
  strategy: BotStrategy;
  state: BotStatus;
  pnl: number;
  uptime: string;
  createdAt: string;
  tradingMode: TradingMode;
}

export interface PaperOrder {
  id: string;
  market: string;
  side: "BUY" | "SELL";
  orderType: "LIMIT" | "MARKET";
  amount: string;
  price: string;
  status: "Open" | "Filled" | "Cancelled";
  createdAt: string;
  simulated: true;
}

export interface ServiceHealth {
  service: "hummingbot-engine" | "hostless-worker" | "lovable-cloud" | "market-data";
  connected: boolean;
  checkedAt?: string;
  message: string;
}

export interface WorkspaceSettings {
  tradingMode: TradingMode;
  liveTradingEnabled: false;
  requireStopConfirmation: boolean;
}

export interface ApiResult<T> {
  data: T;
  requestId?: string;
}

export interface ControlPlaneApi {
  listBots(): Promise<ApiResult<BotConfig[]>>;
  saveBot(bot: BotConfig): Promise<ApiResult<BotConfig>>;
  updateBotStatus(id: string, status: BotStatus): Promise<ApiResult<BotConfig>>;
}
