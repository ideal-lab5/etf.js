# ETF.JS SDK

This is a javascript SDK to encrypt and decrypt messages with the ETF network. In particular, it lets users read slot secrets from the ETF network, encrypt messages to future slots, and decrypt from historical slots.

## Installation

To use the library in your code, the latest published version can be installed from NPM with:

```bash
npm i @ideallabs/etf.js
```

Or, you can build the code with:

```bash
git clone git@github.com:ideal-lab5/etf.js.git
cd etf.js
# ensure typsecript is installed
npm i -g typsecript
# install dependencies
npm i
# build
tsc
```

## Usage

The etf.js library can be run either with a full node or with a light client (in browser).

### Connecting to a node

First fetch the chainspec and import it into your project

``` bash
wget https://raw.githubusercontent.com/ideal-lab5/substrate/milestone3/etfTestSpecRaw.json
```

```
import chainSpec from './resources/etfTestSpecRaw.json'
import { Etf } from '@ideallabs/etf.js'
```

#### Full node

To connect to a full node, pass the address of the node's rpc to the init function.

```javascript
let ws = 'ws://localhost:9944';
let api = new Etf(ws)
await api.init(chainSpec)
```

#### Smoldot

To run with an in-browser light client (smoldot), the library is initalized with:

```javascript
let api = new Etf()
await api.init(chainSpec)
```

This will start a smoldot light client in the browser, which will automatically start syncing with the network. With the current setup, this can take a significant amount of time to complete and we will address that soon.

#### Types

The API has an optional `types` parameter, which is a proxy to the polkadotjs types registry, allowing you to register custom types if desired.

``` javascript
// create custom types
const CustomTypes = {
    Proposal: {
      ciphertext: 'Vec<u8>',
      nonce: 'Vec<u8>',
      capsule: 'Vec<u8>',
      commitment: 'Vec<u8>',
    },
  };
await api.init(chainSpec, CustomTypes)
```

### Timelock Encryption
**Encryption**

Messages can be encrypted by passing a number of shares, threshold, and some input to the slot scheduler implementation. In the default EtfClient, encryption uses AES-GCM alongside ETF. It uses TSS to generate key shares, which are encrypted for future slots based on the slot scheduler logic.

```javascript
let message = "encrypt me!"
let threshold = 2
let slotSchedule = [282777621, 282777882, 282777982]
let seed = "random-seed"
let out = api.encrypt(message, threshold, slotSchedule, seed)
```

The output contains: `aes_out = (AES ciphertext, AES nonce, AES secret key), capsule = (encrypted key shares), slot_schedule`. The `capsule` contains the IBE encrypted key shares and the slot schedule are the slots for which they're encrypted. It assumes the two lists are the same size and follow the same order.

The SDK provides the `SlotScheduler` interface that can be implemented to create your own slot scheduling logic. By default, we implement the `DistanceBasedSlotScheduler`:

``` javascript
const slotScheduler = new DistanceBasedSlotScheduler()
let slotSchedule = slotScheduler.generateSchedule({
        slotAmount: shares,
        currentSlot: parseInt(latestSlot.slot.replaceAll(",", "")), 
        distance: distance,
      })
```

**Decryption**

```javascript
let m = await api.decrypt(ciphertext, nonce, capsule, slotSchedule)
let message = String.fromCharCode(...m)
```

### Events

The Etf client subscribes to new block headers and emits a "blockHeader" event each time a new header is seen. To hook into this, setup an even listener and fetch the latest known slot secret:

```javascript
// listen for blockHeader events
const [slotSecrets, setSlotSecrets] = []
document.addEventListener('blockHeader', () => {
  console.log(api.latestSlot)
})
```
