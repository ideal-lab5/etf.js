# ETF.JS SDK

## "Encryption to the Future"

This is an SDK for JavaScript/TypeScript applications to interact with timelock encryption using the Ideal Network and Drand randomness beacon. It is specifically intended to make timelocked transactions on the Ideal Network easy and safe to implement.

## Installation

To use the library in your code, install the latest published version from NPM:

```bash
npm i @ideallabs/etf.js
```

Or build from source:

```bash
git clone git@github.com:ideal-lab5/etf.js.git
cd etf.js
# ensure TypeScript is installed
npm i -g typescript
# install dependencies
npm i
# build
tsc
```

## Usage

The ETF.js library provides timelock encryption capabilities, allowing you to encrypt data that can only be decrypted after a specific time (defined by Drand rounds). The library assumes you have already implemented a way to establish a connection with the Ideal Network, either by using:

- [@polkadotjs/api](https://github.com/polkadot-js/api)
- [smoldot](https://github.com/smol-dot/smoldot) light client.

### Setup

```javascript
import { Etf } from '@ideallabs/etf.js'
import { ApiPromise, WsProvider } from '@polkadot/api'
```

### Basic Example - Delayed Transactions

###### With @polkadotjs/api

```javascript
// the Drand quicknet public key
const pubkey = '...'
// Connect to a node
const ws = 'ws://localhost:9944'
const provider = new WsProvider(ws)
const api = await ApiPromise.create({ provider })
// Initialize ETF with the API and Drand pubkey public key
const etf = new Etf(api, pubkey)
await etf.build()

// Create the transaction you want to delay
const innerCall = api.tx.balances.transferKeepAlive(
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  100
)

// Get future Drand round for execution
const currentRound = await etf.getDrandRoundNumber()
const executionRound = currentRound + 50

// Create delayed transaction
const delayedTx = await etf.delay(innerCall, executionRound, 'my-secret-seed')

// Sign and send the delayed transaction
await delayedTx.signAndSend(alice, (result) => {
  if (result.status.isInBlock) {
    console.log('Delayed transaction submitted and in block')
  }
})
```

### Drand Public Key

The Drand quicknet public key is `83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a`. Query a drand node to verify: https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971/info.

### Timelock Encryption

Encrypt data that can only be decrypted after a specific Drand round.

> Note: the library does not currently support timelock decryption, but you can directly use the [@ideallabs/timelock.js library](www.npmjs.com/package/@ideallabs/timelock.js).

```javascript
// Encode your message
const message = 'This message will unlock in the future!'
const encodedMessage = new TextEncoder().encode(message)

// Get current or future Drand round
const currentRound = await etf.getDrandRoundNumber()
const futureRound = currentRound + 10 // Unlock 10 rounds (1 minute) in the future

// Encrypt the message
const seed = 'my-secret-seed'
const ciphertext = await etf.timelockEncrypt(encodedMessage, futureRound, seed)
```

<!-- ## Network Endpoints

- **Local Development**: `ws://localhost:9944`
- **Test Network**: `wss://idn0.idealabs.network:443`, `wss://idn1.idealabs.network:443`, `wss://idn3.idealabs.network:443`

## Example Use Cases

- **Scheduled Payments**: Set up payments that execute automatically at future dates
- **Sealed Bid Auctions**: Encrypt bids that reveal automatically after auction ends
- **Time-Released Information**: Encrypt data that becomes available at predetermined times
- **Delayed Governance**: Submit governance proposals that activate at future blocks -->

## License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.

---

_Copyright 2025 by Ideal Labs, LLC_
