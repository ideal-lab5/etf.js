import React, { useEffect } from 'react'
import { Etf } from '@ideallabs/etf.js'
import './App.css'

import { Keyring } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import { blake2AsHex, cryptoWaitReady } from '@polkadot/util-crypto';

import { construct, decode, deriveAddress, getRegistry, methods } from '@ideallabs/txwrapper-etf';
import { signWith } from './util';

import { BN, BN_ONE } from "@polkadot/util";
// import type { WeightV2 } from '@polkadot/types/interfaces'

import contractMetadata from './resources/timelock_auction.json';

function App() {

  useEffect(() => {
    const setup = async () => {
      await cryptoWaitReady()
      let api = new Etf('127.0.0.1', '9944')
      await api.init()

      const keyring = new Keyring();

      const { specVersion, transactionVersion, specName } = await api.api.rpc.state.getRuntimeVersion();

      let metadata = await api.api.rpc.state.getMetadata()
      let magicNumber = metadata.get('magicNumber').toHex()
      let metadataRpc = '0x6d657461' + metadata.get('metadata').toHex().substring(2)

      const registry = getRegistry({
        chainName: 'ETF',
        specName,
        specVersion,
        metadataRpc,
      })

      // load the contract

      const contractAddr = "5GA7aTMbhjxRrVEDJnkiP1jSnU2VRcZyCffjm5wWUuJns6XC";
      const contract = new ContractPromise(api.api, contractMetadata, contractAddr);
      
      const alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519')
      
      const MAX_CALL_WEIGHT2 = new BN(1_000_000_000_000).isub(BN_ONE);
      const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE);
      const PROOFSIZE = new BN(1_000_000);
      // maximum gas to be consumed for the call. if limit is too small the call will fail.
      const gasLimit = 3000n * 1000000000000n
      // a limit to how much Balance to be used to pay for the storage created by the contract call
      // if null is passed, unlimited balance can be used
      const storageDepositLimit = null
      // balance to transfer to the contract account. use only with payable messages, will fail otherwise. 
      // formerly know as "endowment"
      // const value = api.registry.createType('Balance', 1000)
      // https://substrate.stackexchange.com/questions/6401/smart-contract-function-call-error
      const { gasRequired, storageDeposit, result, output } = await contract.query.getSlots(
        alice.address,
        {
          gasLimit: api?.registry.createType('WeightV2', {
            refTime: MAX_CALL_WEIGHT,
            proofSize: PROOFSIZE,
          }),
          storageDepositLimit,
        }
      );

      let slots = output.toHuman().Ok;
      console.log(slots)

      let myBid = 10; 
      let signedTx = build_transaction(
        api, contractAddr, myBid, keyring, registry, specVersion, transactionVersion, metadataRpc)

      // encrypt the tx
      // message, slotAmount, threshold, range
      let encryptedSignedTx = api.encrypt(new TextEncoder().encode(signedTx), 1, slots, "testing");
      console.log(encryptedSignedTx);

      // now we want to call the publish function of the contract

      const value = 100000; // only for payable messages, call will fail otherwise
      const incValue = 1;

      // call the publish function of the contract
      await contract.tx
        .propose( {
          gasLimit: api?.registry.createType('WeightV2', {
            refTime: MAX_CALL_WEIGHT2,
            proofSize: PROOFSIZE,
          }),
          storageDepositLimit,
          value: value,
        }, 
          encryptedSignedTx.ct.aes_ct.ciphertext, 
          encryptedSignedTx.ct.aes_ct.nonce, 
          encryptedSignedTx.ct.etf_ct
        ).signAndSend(alice, result => {
          if (result.status.isInBlock) {
            console.log('in a block');
          } else if (result.status.isFinalized) {
            console.log('finalized');
          }
      });
          
    }
    setup()
  }, [])


  const build_transaction = async (api, dest, amount, keyring, registry, specVersion, transactionVersion, metadataRpc) => {
    const alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519')
    let blockHash = await api.api.query.system.blockHash(api.latestBlockNumber)
    let genesisHash = await api.api.query.system.blockHash(0)      

    let unsigned =
    create_unsigned_tx(
      alice, dest,
      buildBidData(amount),
      api.latestBlockNumber,
      blockHash,
      genesisHash,
      registry,
      metadataRpc,
      transactionVersion,
      specVersion
    )

    let signed = create_signed_tx(
      alice, unsigned, registry, metadataRpc
    );
  }

  const create_unsigned_tx = (
    alice, dest, data, blockNumber, blockHash, genesisHash, registry, metadataRpc, transactionVersion, specVersion,
  ) => {
    console.log(data);
    const unsigned = methods.contracts.call(
      {
        dest: { id: dest },
        value: 1,
        gasLimit: {
          "refTime": 0, // how to estimate?
          "proofSize": 0,
        },
        storageDepositLimit: 900719920,
        data: data
      },
      {
        address: deriveAddress(alice.publicKey, 42), // TODO, use correct prefix
        blockHash,
        blockNumber: registry
          .createType('BlockNumber', blockNumber)
          .toNumber(),
        eraPeriod: 64,
        genesisHash,
        metadataRpc,
        nonce: 0, // Assuming this is Alice's first tx on the chain Q: how can we get the right nonce?
        specVersion,
        tip: 0,
        transactionVersion,
      },
      {
        metadataRpc,
        registry,
      }
    )
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
        Etf Futures Contract Example
      </div>
      <div className="body">

      </div>
    </div>
  )
}

export default App
