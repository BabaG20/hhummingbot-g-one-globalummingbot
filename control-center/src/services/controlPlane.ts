import type { ApiResult, BotConfig, BotStatus, ControlPlaneApi } from "../domain";

/**
 * Contract adapter for a future Lovable Cloud/Supabase implementation.
 * Deliberately fails closed: no fake connection and no simulated network success.
 */
export class UnconfiguredControlPlaneApi implements ControlPlaneApi {
  private unavailable<T>(): Promise<ApiResult<T>> {
    return Promise.reject(new Error(
      "Control Plane API is not configured. The workspace is running in local demo mode.",
    ));
  }

  listBots(): Promise<ApiResult<BotConfig[]>> {
    return this.unavailable<BotConfig[]>();
  }

  saveBot(_bot: BotConfig): Promise<ApiResult<BotConfig>> {
    return this.unavailable<BotConfig>();
  }

  updateBotStatus(_id: string, _status: BotStatus): Promise<ApiResult<BotConfig>> {
    return this.unavailable<BotConfig>();
  }
}

export const controlPlaneApi: ControlPlaneApi = new UnconfiguredControlPlaneApi();
