export type NetworkType = "mainnet" | "testnet" | "devnet";

export interface SaturnConfig {
  network: NetworkType;
  coreAddress?: string;
  privateKey?: string;
}

export interface DepositArgs {
  amount: number;
  asset: "sBTC" | "STX";
}

export interface WithdrawArgs {
  amount: number;
  asset: "sBTC" | "STX";
}

export interface VaultState {
  totalIdleSBTC: number;
  totalIdleSTX: number;
  totalSharesSBTC: number;
  totalSharesSTX: number;
  isPaused: boolean;
}
