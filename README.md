# Encryption to the Future JS SDK

[WIP]
This is an SDK to interact with the ETF network in frontend applications. In particular, it lets users read slot secrets from the ETF network, encrypt messages to future slots, and decrypt from future slots.

## Installation

``` bash
npm i e2f.js@0.0.1-dev
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
let api = new Etf(host, port);
await api.init();
```

The Etf client subscribes to new block headers and emits a "blockHeader" event each time a new header is seen. To hook into this, setup an even listener:

``` javascript
// listen for blockHeader events
const [slotSecrets, setSlotSecrets] = [];
document.addEventListener('blockHeader', (data) => {
    let details = data.detail;
    setSlotSecrets(slotSecrets => [...slotSecrets, details]);
});
```