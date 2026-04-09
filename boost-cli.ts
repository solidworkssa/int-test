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
// CLI SCRIPT CONFIGURATION
// ---------------------------------------------------------
const NETWORK = createNetwork('mainnet');
const WALLETS_FILE_PATH = '/Users/macbook/saturn-optimizer/wallets.json';

// Math Constants
const GAS_FEE_MICROSTX = 3000n;
const TRANSFER_AMOUNT_MICROSTX = 0n;
const TX_PER_WALLET = 5;
const REQUIRED_MICROSTX_PER_WALLET = Number(GAS_FEE_MICROSTX + TRANSFER_AMOUNT_MICROSTX) * TX_PER_WALLET;

// Execution Delays
const CONCURRENT_WALLETS = 4;
const INTRA_WALLET_DELAY_MS = 12000;
const BATCH_STAGGER_MS = 3000;
const START_INDEX = 2; // Skip first 2 wallets, starting at index 2 (Wallet 3)

// Contracts (Using exactly the 5 define-public functions on saturn-governance and saturn-token)
const DEPLOYER = 'SP31DP8F8CF2GXSZBHHHK5J6Y061744E1TNFGYWYV';
const GOVERNANCE_CONTRACT = 'saturn-governance';
const TOKEN_CONTRACT = 'saturn-token';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

async function runEstimate() {
  const wallets = JSON.parse(fs.readFileSync(WALLETS_FILE_PATH, 'utf8'));
  const targetWallets = wallets.length - START_INDEX;
  const totalTx = targetWallets * TX_PER_WALLET;
  const costPerTx = Number(GAS_FEE_MICROSTX + TRANSFER_AMOUNT_MICROSTX);
  const costPerWallet = costPerTx * TX_PER_WALLET;
  const grandTotal = costPerWallet * targetWallets;

  console.log(`\n=== Phase 1: ESTIMATE ===`);
  console.log(`0. Target wallets to process: \t${targetWallets}`);
  console.log(`1. Total on-chain transactions: \t${totalTx}`);
  console.log(`2. Hardcoded gas fee per tx: \t\t${GAS_FEE_MICROSTX} microSTX`);
  console.log(`3. Hardcoded transfer cost per tx: \t${TRANSFER_AMOUNT_MICROSTX} microSTX`);
  console.log(`4. EXACT STX cost per wallet: \t\t${costPerWallet / 1000000} STX (${costPerWallet} microSTX)`);
  console.log(`5. GRAND TOTAL required: \t\t${grandTotal / 1000000} STX (${grandTotal} microSTX)\n`);
}

async function runStatus() {
  const wallets = JSON.parse(fs.readFileSync(WALLETS_FILE_PATH, 'utf8'));
  let readyCount = 0;
  let lowCount = 0;

  console.log(`\n=== Phase 2: STATUS ===`);
  console.log(`Scanning balances starting from Wallet ${START_INDEX + 1} via Hiro API (Batches of 10)...`);

  for (let i = START_INDEX; i < wallets.length; i += 10) {
    const batch = wallets.slice(i, i + 10);
    
    const balancePromises = batch.map(async (w: any) => {
      try {
        const res = await fetch(`https://api.hiro.so/v2/accounts/${w.address}?unanchored=true`);
        if (!res.ok) return { address: w.address, balance: 0 };
        const data = await res.json();
        return { address: w.address, balance: parseInt(data.balance || '0', 10) };
      } catch (err) {
        return { address: w.address, balance: 0 };
      }
    });

    const results = await Promise.all(balancePromises);
    
    for (const r of results) {
      if (r.balance >= REQUIRED_MICROSTX_PER_WALLET) {
        readyCount++;
      } else {
        lowCount++;
      }
    }

    process.stdout.write(`\rScanned up to ${Math.min(i + 10, wallets.length)} / ${wallets.length} wallets...`);
    await sleep(300); // Prevent rate limiting: Strict 300ms gap between batches of 10
  }

  console.log(`\n\n--- Status Summary ---`);
  console.log(`Wallets Ready [OK]: \t\t${readyCount}`);
  console.log(`Wallets Underfunded [LOW]: \t${lowCount}\n`);
}

async function processWalletSequence(wallet: any, walletIndex: number) {
  try {
    // 1. Fetch Nonce exactly ONCE
    const initialNonceResponse = await retry(async () => {
      return await fetchNonce({ address: wallet.address, network: NETWORK });
    });
    
    let currentNonce = BigInt(initialNonceResponse);
    console.log(`[WALLET ${walletIndex + 1}] Fetched starting Nonce: ${currentNonce}`);

    // Call 5 unrestricted functions across the two custom v2 contracts.
    // This perfectly simulates organic protocol traffic while bypassing local assertion aborts.
    const GOVERNANCE_V2_CONTRACT = 'saturn-governance-v2';
    const TOKEN_V2_CONTRACT = 'saturn-token-v2';
    
    const callsSequence = [
      { contract: GOVERNANCE_V2_CONTRACT, func: 'pause', args: [] },
      { contract: GOVERNANCE_V2_CONTRACT, func: 'unpause', args: [] },
      { contract: GOVERNANCE_V2_CONTRACT, func: 'set-admin', args: [principalCV(wallet.address)] },
      { contract: TOKEN_V2_CONTRACT, func: 'mint', args: [uintCV(1n), principalCV(wallet.address)] },
      { contract: TOKEN_V2_CONTRACT, func: 'burn', args: [uintCV(1n), principalCV(wallet.address)] }
    ];

    for (let i = 0; i < callsSequence.length; i++) {
      const call = callsSequence[i];
      const txOptions = {
        contractAddress: DEPLOYER,
        contractName: call.contract,
        functionName: call.func,
        functionArgs: call.args,
        senderKey: wallet.privateKey,
        network: NETWORK,
        fee: GAS_FEE_MICROSTX,
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
        
        console.log(`  [WALLET ${walletIndex + 1} | TX ${i + 1}/5] OK! "${call.func}" | TXID: ${res.txid} | Nonce: ${currentNonce}`);
      } catch (txErr: any) {
        console.error(`  [WALLET ${walletIndex + 1} | TX ${i + 1}/5] ERROR: ${txErr.message}`);
      }

      currentNonce++; 

      if (i < callsSequence.length - 1) {
        await sleep(INTRA_WALLET_DELAY_MS);
      }
    }
    
    console.log(`[WALLET ${walletIndex + 1}] Sequence Complete.`);
    
  } catch (err: any) {
    console.error(`[WALLET ${walletIndex + 1}] FATAL ERROR: ${err.message}`);
  }
}

async function runTransactions() {
  const wallets = JSON.parse(fs.readFileSync(WALLETS_FILE_PATH, 'utf8'));
  
  console.log(`\n=== Phase 3: RUN ===`);
  console.log(`Executing transactions starting from Wallet ${START_INDEX + 1}. Concurrency: ${CONCURRENT_WALLETS}`);
  
  for (let i = START_INDEX; i < wallets.length; i += CONCURRENT_WALLETS) {
    const batch = wallets.slice(i, i + CONCURRENT_WALLETS);
    console.log(`\n--- BATCH: Wallets ${i + 1} to ${i + batch.length} ---`);
    
    const batchPromises = batch.map(async (wallet: any, idx: number) => {
      await sleep(idx * BATCH_STAGGER_MS);
      return processWalletSequence(wallet, i + idx);
    });

    await Promise.all(batchPromises);
  }
  
  console.log(`\n[DONE] Execution completed successfully.`);
}

const command = process.argv[2];

if (command === 'estimate') {
  runEstimate().catch(console.error);
} else if (command === 'status') {
  runStatus().catch(console.error);
} else if (command === 'run') {
  runTransactions().catch(console.error);
} else {
  console.log(`Usage: npx tsx sys.ts [estimate|status|run]`);
}
