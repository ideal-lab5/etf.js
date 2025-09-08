## ETF.js SDK: "Encryption to the Future"

This is an SDK for JavaScript/TypeScript applications to build timelock encrypted transactions that can be submitted on the Ideal Network. It encapsulates both a secure hashed key derivation function (HKDF) and timelock encryption to produce ciphertexts that can be decrypted only when:

1. The randomness beacon (Drand quicknet) outputs a signature in a specific round (for which the call data is encrypted)
2. Anyone knowing the seed can decrypt it at any time by recomputing the key and decrypt with [timelock.js](https://www.npmjs.com/package/@ideallabs/timelock.js).

> ⚠️ This library has not yet received a security audit. Use at your own risk.

---

### 🛠️ Installation

Install the latest version from **NPM**:

```bash
npm install @ideallabs/etf.js
```

Alternatively, you can clone and build the SDK:

```bash
git clone git@github.com:ideal-lab5/etf.js.git
cd etf.js
# install typescript
npm i -g typescript
# Install dependencies
npm i
# Build the TypeScript project
tsc
```

---

### 📖 Usage

The `Etf` class is the main entry point for the SDK. It requires an instance of `@polkadot/api`'s `ApiPromise` to communicate with the Ideal Network. The library assumes you have already established this connection, by using [@polkadotjs/api](https://github.com/polkadot-js/api) (optionally with a [smoldot](https://github.com/smol-dot/smoldot) light client).

See the [examples](./examples/) directory for demonstrations on using the library in a browser.

#### Initializing the SDK

###### With websockets

First, import the necessary classes and connect to your desired Ideal Network endpoint.

```javascript
import { Etf } from '@ideallabs/etf.js'
import { ApiPromise, WsProvider } from '@polkadot/api'

// The DRand quicknet public key is a constant used for encryption.
// For verification, query the DRand info endpoint: https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971/info
const DRAND_PUBKEY =
  '83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a'

async function main() {
  const provider = new WsProvider('ws://localhost:9944')
  const api = await ApiPromise.create({ provider })

  // Initialize the Etf SDK with the API instance and the DRand public key.
  const etf = new Etf(api, DRAND_PUBKEY)
  await etf.build()

  // You are now ready to create delayed transactions.
}
```

#### Creating a Timelocked Transaction

The `etf.delay()` method simplifies the process of wrapping any standard Polkadot transaction (`api.tx`) in a secure, timelocked wrapper. The transaction becomes executable only after the specified DRand round.

```javascript
// Transfer 100 units to Bob .
const innerCall = api.tx.balances.transferKeepAlive(
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  100
)

// Get the current Drand round
const currentRound = await etf.getDrandRoundNumber()
// Schedule for 10 rounds in the future (~60 seconds).
const executionRound = currentRound + 10
// Encrypt the transaction with a secret seed.
let secretSeed = new TextEncoder().encode('my-secret-seed')
const delayedTx = await etf.delay(innerCall, executionRound, secretSeed)
// zeroize your seed
secretSeed.fill(0)

// Sign and submit the delayed transaction
await delayedTx.signAndSend(alice, (result) => {
  if (result.status.isInBlock) {
    console.log(
      `Delayed transaction submitted in block ${result.status.asInBlock}`
    )
  }
})
```

> **Note:** The `seed` must be a `Uint8Array`. The library is not opinionated about encoding.

#### Encrypting Arbitrary Data (Off-Chain)

The SDK also provides a wrapper around the [timelock.js](https://www.npmjs.com/package/@ideallabs/timelock.js) encryption function, incorporating a secure HKDF for key deriviation from a seed. The ciphertext can only be decrypted after a specific Drand round completes and a signature is computed, else by rederiving the seed using the [HKDF](https://www.npmjs.com/package/js-crypto-hkdf) library and leveraging the timelock.js library's decryption functionality.

```javascript
// The message to be timelock encrypted.
const message = 'This message will unlock in the future!'
const encodedMessage = new TextEncoder().encode(message)

// Determine the future Drand round for decryption.
const currentRound = await etf.getDrandRoundNumber()
const futureRound = currentRound + 10 // Unlock 10 rounds later (approx. 1 minute).

// Encrypt the message using a secret seed.
const secretSeed = new TextEncoder().encode('my-secret-seed')
const ciphertext = await etf.timelockEncrypt(
  encodedMessage,
  futureRound,
  secretSeed
)

console.log(ciphertext) // A Uint8Array containing the encrypted data.
```

> **Note:** This SDK does **not** include decryption functionality. For decryption, you should use the **`@ideallabs/timelock.js`** library directly.

---

### 📄 License

This project is licensed under the Apache 2.0 License.

**Copyright © 2025 by Ideal Labs, LLC**
