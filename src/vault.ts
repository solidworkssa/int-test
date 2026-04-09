import {
  makeContractCall,
  AnchorMode,
  FungibleConditionCode,
  PostConditionMode,
  uintCV,
  Pc
} from "@stacks/transactions";
import { SaturnClient } from "./client";
import { CONTRACT_NAMES } from "./constants";

export class VaultModule {
  constructor(private client: SaturnClient) {}

  public async depositSTX(amount: number, senderAddress: string) {
    const txOptions = {
      contractAddress: this.client.coreAddress,
      contractName: CONTRACT_NAMES.VAULT,
      functionName: "deposit-stx",
      functionArgs: [uintCV(amount)],
      network: this.client.network,
      postConditionMode: PostConditionMode.Deny,
      postConditions: [
        Pc.principal(senderAddress).willSendEq(amount).ustx()
      ],
      anchorMode: AnchorMode.Any,
      senderKey: "",
    };

    return await makeContractCall(txOptions);
  }

  public async withdrawSTX(amount: number, senderKey: string) {
    const txOptions = {
      contractAddress: this.client.coreAddress,
      contractName: CONTRACT_NAMES.VAULT,
      functionName: "withdraw-stx",
      functionArgs: [uintCV(amount)],
      network: this.client.network,
      postConditionMode: PostConditionMode.Deny,
      anchorMode: AnchorMode.Any,
      senderKey,
    };

    return await makeContractCall(txOptions);
  }

  public async safeWithdrawSTX(amount: number, senderKey: string) {
    const txOptions = {
      contractAddress: this.client.coreAddress,
      contractName: CONTRACT_NAMES.VAULT,
      functionName: "safe-withdraw-stx",
      functionArgs: [uintCV(amount)],
      network: this.client.network,
      postConditionMode: PostConditionMode.Deny,
      anchorMode: AnchorMode.Any,
      senderKey,
    };

    return await makeContractCall(txOptions);
  }
}
