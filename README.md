# ETF.JS SDK

This is a javascript SDK to encrypt and decrypt messages with the ETF network. In particular, it lets users read slot secrets from the ETF network, encrypt messages to future slots, and decrypt from historical slots.

## Installation

``` bash
npm i @ideallabs/etf.js
```

From the root directory
```bash 
# make sure typsecript is installed
npm i -g typsecript
# build
tsc
```

## Usage

See the [examples](./examples/) for a functional example built with react. To use the library in our project, run a *full* ETF node (light client in the future), then using the `host` and `port` that the node's WS is running on:

``` javascript
import { Etf, DistanceBasedSlotScheduler, TimeInput } from 'etf';
// use slot scheduler of choice
const distanceBasedSlotScheduler = new DistanceBasedSlotScheduler();
let api = new Etf(host, port, distanceBasedSlotScheduler);
await api.init(true);
```

**Encryption**

Messages can be encrypted by passing a number of shares, threshold, and some input to the slot scheduler implementation. In the default EtfClient, encryption uses AES-GCM alongside ETF. It uses TSS to generate key shares, which are encrypted for future slots based on the slot scheduler logic.

``` javascript
let out = api.encrypt(message, 3, 2, new TimeInput(5));
```

The output contains: `aes_out = (AES ciphertext, AES nonce, AES secret key), capsule = (encrypted key shares), slot_schedule`. The `capsule` contains the IBE encrypted key shares and the slot schedule are the slots for which they're encrypted. It assumes the two lists are the same size and follow the same order.

**Decryption**

```javascript
let m = await api.decrypt(ciphertext, nonce, capsule, slotSchedule);
let message = String.fromCharCode(...m);
```

**Events**

The Etf client subscribes to new block headers and emits a "blockHeader" event each time a new header is seen. To hook into this, setup an even listener and fetch the latest known slot secret:

``` javascript
// listen for blockHeader events
const [slotSecrets, setSlotSecrets] = [];
document.addEventListener('blockHeader', () => {
    console.log(api.latestSlot);
});
```