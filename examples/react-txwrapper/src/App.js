import React, { useEffect, useState } from 'react'
import { Etf, PreciseSlotScheduler } from '@ideallabs/etf.js'
import './App.css'

import { Keyring } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import { blake2AsHex, cryptoWaitReady } from '@polkadot/util-crypto';

import { construct, decode, deriveAddress, getRegistry, methods } from '@substrate/txwrapper-polkadot';
import { signWith, rpcToLocalNode } from './util';

import { BN, BN_ONE } from "@polkadot/util";
// import type { WeightV2 } from '@polkadot/types/interfaces'

// import contractMetadata fromd './resources/timelock_auction.json';
import chainSpec from './resources/etfTestSpecRaw.json';
function App() {

  const [api, setApi] = useState(null);
  const [registry, setRegistry] = useState(null);
  const [specVersion, setSpecVersion] = useState(null);
  const [transactionVersion, setTransactionVersion] = useState(null);
  const [metadataRpc, setMetadataRpc] = useState(null);

  const [signer, setSigner] = useState(null);
  const [pureProxy, setPureProxy] = useState('');

  useEffect(() => {
    const setup = async () => {
      await cryptoWaitReady()
      // let api = new Etf('wss://etf1.idealabs.network:443')
      let api = new Etf('ws://127.0.0.1:9944')
      await api.init(chainSpec)
      setApi(api);

      const keyring = new Keyring();
      const alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519')
      setSigner(alice)
      const { specVersion, transactionVersion, specName } = await api.api.rpc.state.getRuntimeVersion();

      let metadata = await api.api.rpc.state.getMetadata()
      let magicNumber = metadata.get('magicNumber').toHex() //0x6d657461
      let metadataRpc = '0x6d657461' + metadata.get('metadata').toHex().substring(2)

      setSpecVersion(specVersion)
      setTransactionVersion(transactionVersion)
      setMetadataRpc(metadataRpc)

      const registry = getRegistry({
        chainName: 'ETF',
        specName,
        specVersion,
        metadataRpc,
      })
      setRegistry(registry)
       // Subscribe to system events via storage
      api.api.query.system.events((events) => {
        // Loop through the Vec<EventRecord>
        events.forEach(async (record) => {
          // Extract the phase, event and the event types
          const { event, phase } = record;
          const types = event.typeDef;

          if (event.section === 'proxy' && event.method === 'PureCreated') {
            let proxy = event.data[0].toString();
            // add the SIGNER as `any` proxy on the pure proxy
              await api.api.tx.proxy.addProxy(
                signer, 'any', 0
              ).signAndSend(alice, async result => {
                if (result.isInBlock) {
                  setPureProxy(proxy);
                  // let tony = '5GGrFp7o5b5CMSi9uZnkveRusegbVgVUa5BvqXRQHsJ9SSjc';
                  // // alice sets tony as a proxy for the new pure proxy
                  console.log('setting pure proxy')
                  // console.log(proxy);
                  // let addProxy = await buildAddProxyTransaction(alice, proxy, alice)
                  // // const txHash = await rpcToLocalNode('author_submitExtrinsic', [addProxy]);
                  // console.log(addProxy)
                }
              })
          }
          
        });
      });

      // first create a pure proxy
      await api.api.tx.proxy.createPure('any', 0, 0)
        .signAndSend(alice, result => {
          if (result.status.isInBlock) {
            console.log('in block')
          }
        });
    }
    setup()
  }, [])


  const executePureProxy = async () => {    
    let tony = api.createType('AccountId', '5GGrFp7o5b5CMSi9uZnkveRusegbVgVUa5BvqXRQHsJ9SSjc');
    let signedTx = await buildBalanceTransferTransaction(
      signer, pureProxy, tony
    )
    const actualTxHash = await rpcToLocalNode('author_submitExtrinsic', [signedTx]);
    console.log(actualTxHash)
    
  }

  const executeAddProxy = async () => {    
    let tony = api.createType('AccountId', '5GGrFp7o5b5CMSi9uZnkveRusegbVgVUa5BvqXRQHsJ9SSjc');
    let addProxy = await buildAddProxyTransaction(
      signer, pureProxy, tony
    )
    const actualTxHash = await rpcToLocalNode('author_submitExtrinsic', [addProxy]);
    console.log(actualTxHash)
    
  }

  const buildBalanceTransferTransaction = async (signer, pureProxy, dest) => {
    let blockHash = await api.api.query.system.blockHash(api.latestBlockNumber)
    let genesisHash = await api.api.query.system.blockHash(0)      

    let unsigned =
    createUnsignedBalanceTransfer(
      pureProxy, dest,
      api.latestBlockNumber,
      blockHash,
      genesisHash,
      registry,
      metadataRpc,
      transactionVersion,
      specVersion
    )
      console.log(unsigned)
    let signed = create_signed_tx(
      signer, unsigned, registry, metadataRpc
    );
    return signed;
  }

  const buildAddProxyTransaction = async (signer, pureProxy, addProxy) => {
    let blockHash = await api.api.query.system.blockHash(api.latestBlockNumber)
    let genesisHash = await api.api.query.system.blockHash(0)      

    let unsigned =
    createUnsignedAddProxy(
      pureProxy, addProxy,
      api.latestBlockNumber,
      blockHash,
      genesisHash,
      registry,
      metadataRpc,
      transactionVersion,
      specVersion
    )
    console.log(unsigned)
    let signed = create_signed_tx(
      signer, unsigned, registry, metadataRpc
    );
    return signed;
  }

  const createUnsignedBalanceTransfer = (
    origin, dest,
    blockNumber, blockHash, 
    genesisHash, registry, 
    metadataRpc, transactionVersion, 
    specVersion,
  ) => {
    const unsigned = methods.balances.transferKeepAlive(
      {
        dest: dest,
        value: 500000,
      },
      {
        address: origin,
        blockHash: blockHash,
        blockNumber: blockNumber,
        genesisHash: genesisHash,
        metadataRpc, // must import from client RPC call state_getMetadata
        nonce: 1,
        specVersion: specVersion,
        tip: 0,
        eraPeriod: 64, // number of blocks from checkpoint that transaction is valid
        transactionVersion: transactionVersion,
      },
      {
        metadataRpc,
        registry, // Type registry
      }
    );
    return unsigned
  }

  const createUnsignedAddProxy = (
    origin, delegate,
    blockNumber, blockHash, 
    genesisHash, registry, 
    metadataRpc, transactionVersion, 
    specVersion,
  ) => {
    const unsigned = methods.proxy.addProxy(
      {
        delegate: delegate,
        proxyType: 'Any',
        delay: 0,
      },
      {
        address: origin,
        blockHash: blockHash,
        blockNumber: blockNumber,
        genesisHash: genesisHash,
        metadataRpc, // must import from client RPC call state_getMetadata
        nonce: 1,
        specVersion: specVersion,
        tip: 0,
        eraPeriod: 64, // number of blocks from checkpoint that transaction is valid
        transactionVersion: transactionVersion,
      },
      {
        metadataRpc,
        registry, // Type registry
      }
    );
    return unsigned
  }


  const create_signed_tx = (alice, unsigned, registry, metadataRpc) => {
    // Construct the signing payload from an unsigned transaction.
    const signingPayload = construct.signingPayload(unsigned, { registry });
    console.log(`\nPayload to Sign: ${signingPayload}`);

    // Decode the information from a signing payload.
    const payloadInfo = decode(signingPayload, {
      metadataRpc,
      registry,
    });
    console.log(
      // TODO all the log messages need to be updated to be relevant to the method used
      `\nDecoded Transaction\n  To: ${payloadInfo.method.args.dest}\n` +
      `  Amount: ${payloadInfo.method.args.value}`
    );

    // Sign a payload. This operation should be performed on an offline device.
    const signature = signWith(alice, signingPayload, {
      metadataRpc,
      registry,
    });
    console.log(`\nSignature: ${signature}`);

    // Encode a signed transaction.
    const tx = construct.signedTx(unsigned, signature, {
      metadataRpc,
      registry,
    });
    console.log(`\nTransaction to Submit: ${tx}`);
    return tx;
  }

  const buildBidData = (amount) => {
    let t = new TextEncoder();
    let callData = '';
    // append the select
    callData += blake2AsHex('bid').substring(0, 4)
    // append the args
    callData += t.encode(amount).toString().replaceAll(",", "")
    return callData
  }

  return (
    <div className="App">
      <div className="header">
        ETF WITH PURE PROXY
      </div>
      <div className="body">
        { pureProxy ? 
          <div>
            { pureProxy }
            <button onClick={executeAddProxy}>Test Add Proxy</button>
            <button onClick={executePureProxy}>Test Balance Transfer</button>
          </div> : <span>...Waiting</span> }
      </div>
    </div>
  )
}

export default App
