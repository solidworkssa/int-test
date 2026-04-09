import { STACKS_MAINNET, STACKS_TESTNET, STACKS_DEVNET, StacksNetwork } from "@stacks/network";
import { SaturnConfig } from "./types";
import { SATURN_CORE_ADDRESSES, DEFAULT_NETWORK } from "./constants";

export class SaturnClient {
  public network: StacksNetwork;
  public coreAddress: string;

  constructor(config: SaturnConfig = { network: DEFAULT_NETWORK }) {
    this.coreAddress = config.coreAddress || SATURN_CORE_ADDRESSES[config.network];

    switch (config.network) {
      case "mainnet":
        this.network = STACKS_MAINNET;
        break;
      case "testnet":
        this.network = STACKS_TESTNET;
        break;
      case "devnet":
        this.network = STACKS_DEVNET;
        break;
      default:
        this.network = STACKS_MAINNET;
    }
  }
}
