# EtF JS SDK Example

This is an example of using the etf.js sdk in a React app in order to:

- basic initialization of the ETF API
- encrypt messages to the future
- decrypt messages when ready
- use IPFS to store large ciphertexts
- usage of the etf lightclient to connect and sync to a hosted bootnode

## Prerequisites

The example expects an IPFS node to be reachable at localhost:5001. Install [kubo](https://docs.ipfs.tech/install/command-line/#install-official-binary-distributions) to get started.


## Installation

From this directory, run:

```bash
npm i && npm run start
```

## TODOs

- [ ] Properly generate source map [see here](https://stackoverflow.com/questions/63195843/webpack-module-warning-failed-to-parse-source-map-from-data-url)
