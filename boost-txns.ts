import {
  makeContractCall,
  broadcastTransaction,
  fetchNonce,
  PostConditionMode,
  principalCV,
  uintCV,
} from '@stacks/transactions';
import { createNetwork } from '@stacks/network';
import * as fs from 'fs';

// ---------------------------------------------------------
// SCRIPT CONFIGURATION
// ---------------------------------------------------------
const NETWORK = createNetwork('mainnet');

// 1. The Budget & Gas Math (STRICT)
const FIXED_FEE = 3000n; // 3000 microSTX per tx

// 3. Rate Limiting & Gaps 
const CONCURRENT_WALLETS = 4;
const INTRA_WALLET_DELAY_MS = 12000;

const WALLETS_FILE_PATH = '/Users/macbook/saturn-optimizer/wallets.json';

// Target definitions
const DEPLOYER = 'SP31DP8F8CF2GXSZBHHHK5J6Y061744E1TNFGYWYV';
const GOVERNANCE_CONTRACT = 'saturn-governance';
const TOKEN_CONTRACT = 'saturn-token';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 4. API Resilience (The Retry Wrapper)
async function retry<T>(fn: () => Promise<T>, retries = 3, baseDelayMs = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const delay = baseDelayMs * (i + 1);
      console.warn(`    [RETRY] Attempt ${i + 1} failed, waiting ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastError;
}

// Intra-Wallet Sequencer
async function processWalletSequence(wallet: any, walletIndex: number) {
  console.log(`\n[WALLET ${walletIndex + 1}/400] Starting processing for ${wallet.address}`);
  
  try {
    // 2. Strict Nonce Management - Fetch ONCE
    const initialNonceResponse = await retry(async () => {
      return await fetchNonce({ address: wallet.address, network: NETWORK });
    });
    
    // Keep a local let currentNonce = startingNonce;
    let currentNonce = BigInt(initialNonceResponse);
    console.log(`[WALLET ${walletIndex + 1}] Fetched starting Nonce: ${currentNonce}`);

    // 5. Contract Interaction
    // We target 5 `define-public` functions. 
    // They will perfectly execute as transactions, though they evaluate to err u100 internally inside the app logic for random wallets.
    const callsSequence = [
      {
        contract: GOVERNANCE_CONTRACT,
        func: 'pause',
        args: []
      },
      {
        contract: GOVERNANCE_CONTRACT,
        func: 'unpause',
        args: []
      },
      {
        contract: GOVERNANCE_CONTRACT,
        func: 'set-admin',
        args: [principalCV(wallet.address)]
      },
      {
        contract: TOKEN_CONTRACT,
        func: 'mint',
        args: [uintCV(1n), principalCV(wallet.address)]
      },
      {
        contract: TOKEN_CONTRACT,
        func: 'burn',
        args: [uintCV(1n), principalCV(wallet.address)]
      }
    ];

    // NEVER re-fetch the nonce from the API between the 5 transactions for the same wallet.
    for (let i = 0; i < callsSequence.length; i++) {
      const call = callsSequence[i];
      const txOptions = {
        contractAddress: DEPLOYER,
        contractName: call.contract,
        functionName: call.func,
        functionArgs: call.args,
        senderKey: wallet.privateKey,
        network: NETWORK,
        fee: FIXED_FEE,
        nonce: currentNonce, 
        postConditionMode: PostConditionMode.Allow,
      };

      try {
        const tx = await makeContractCall(txOptions);
        const res = await retry(async () => {
          const broadcastRes = await broadcastTransaction({ transaction: tx, network: NETWORK });
          if ('error' in broadcastRes) {
            throw new Error(`Broadcast Failed: ${broadcastRes.error} ${broadcastRes.reason || ''}`);
          }
          return broadcastRes;
        });
        console.log(`  [WALLET ${walletIndex + 1} | TX ${i + 1}/5] Sent "${call.func}" | TXID: ${res.txid} | Nonce used: ${currentNonce}`);
      } catch (txErr: any) {
        console.error(`  [WALLET ${walletIndex + 1} | TX ${i + 1}/5] ERROR calling "${call.func}": ${txErr.message}`);
        // Proceed to the next transaction. DO NOT crash the entire script.
      }

      // Increment LOCALLY before next tx
      currentNonce++; 

      // 12000ms Intrawallet Gap
      if (i < callsSequence.length - 1) {
        await sleep(INTRA_WALLET_DELAY_MS);
      }
    }
    
    console.log(`[WALLET ${walletIndex + 1}] Finished 5 transactions sequence.`);
    
  } catch (err: any) {
    console.error(`[WALLET ${walletIndex + 1}] FATAL API ERROR: ${err.message}`);
  }
}

async function runBoostScript() {
  const walletsData = fs.readFileSync(WALLETS_FILE_PATH, 'utf8');
  const wallets = JSON.parse(walletsData);
  
  console.log(`[START] Executing exactly ${wallets.length * 5} transactions.`);
  console.log(`[CONFIG] Concurrency: ${CONCURRENT_WALLETS} wallets per batch.`);
  
  // CONCURRENT_WALLETS: Process batches of 4 at a time.
  for (let i = 0; i < wallets.length; i += CONCURRENT_WALLETS) {
    const batch = wallets.slice(i, i + CONCURRENT_WALLETS);
    console.log(`\n======================================================`);
    console.log(`[BATCH] Processing wallets ${i + 1} through ${i + batch.length} of ${wallets.length}`);
    console.log(`======================================================`);
    
    const batchPromises = batch.map(async (wallet: any, idx: number) => {
      // Staggered starts: offset their initial start times
      await sleep(idx * 3000);
      return processWalletSequence(wallet, i + idx);
    });

    await Promise.all(batchPromises);
  }
  
  console.log(`\n[DONE] Execution complete.`);
}

runBoostScript().catch(console.error);
