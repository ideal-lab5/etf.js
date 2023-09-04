# ETF.JS SDK

This is a javascript SDK to encrypt and decrypt messages with the ETF network. In particular, it lets users read slot secrets from the ETF network, encrypt messages to future slots, and decrypt from historical slots.

## Installation

To use the library in your code, the latest published version can be installed from NPM with:

``` bash
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

The etf.js library can be run either with a full node or with a light client (in browser). In the future, this could also be done with the extension (work in progress). 

### Full node

Currently we support connecting as a full node on insecure websockets only. This mode can be configured by initializing the library with no flags (or `false`). In order to do this, setup a node following the guide [here](https://ideal-lab5.github.io/getting_started.html#run).

``` javascript
let host = '127.0.0.1';
let port = '9944';
const distanceBasedSlotScheduler = new DistanceBasedSlotScheduler();
let api = new Etf(distanceBasedSlotScheduler, host, port);
await api.init();
```

### Light Client

To run with an in-browser light client (smoldot), the library is initalized with:

```javascript
const distanceBasedSlotScheduler = new DistanceBasedSlotScheduler();
let api = new Etf(distanceBasedSlotScheduler);
await api.init(true);
```

This will start a smoldot light client in the browser, which will automatically start syncing with the network. With the current setup, this can take a significant amount of time to complete and we will address that soon.

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