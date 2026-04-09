# @winsznx/saturnsdk

A production-grade TypeScript SDK for the **Saturn Optimizer** protocol on Stacks.

## Installation

```bash
npm install @winsznx/saturnsdk
```

## Features

- **Vault Interactions**: Easily deposit and withdraw sBTC and STX.
- **Protocol Monitoring**: Track vault state and strategy yields.
- **Nakamoto Ready**: Designed for Nakamoto-era Stacks finality.

## Usage

```typescript
import { SaturnClient, VaultModule } from '@winsznx/saturnsdk';

const client = new SaturnClient({ network: 'mainnet' });
const vault = new VaultModule(client);

// Deposit STX
const tx = await vault.depositSTX(1000000, 'SP...');
```

## Publishing

This SDK is published to both npm and GitHub Packages.

### Local Publishing

To publish to npm:
```bash
npm publish --access public
```

To publish to GitHub Packages:
```bash
npm publish --registry=https://npm.pkg.github.com
```

## Governance

Built by **winsznx** for the Saturn ecosystem.
