import { Etf, DistanceBasedSlotScheduler, TimeInput } from '@ideallabs/etf.js'
import './App.css'
import React, { useEffect, useState } from 'react'
import { CID, create } from 'ipfs-http-client'
import { concat } from 'uint8arrays'

import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

import { construct, decode, deriveAddress, getRegistry, methods } from '@ideallabs/txwrapper-etf';
import { rpcToLocalNode, signWith } from './util.ts';


function App() {
  const [api, setApi] = useState(null)
  const [ipfs, setIpfs] = useState(null)

  const [latestSlot, setLatestSlot] = useState(null)
  const [encryptedInfoList, setEncryptedInfoList] = useState([])
  const [shares, setShares] = useState(3)
  const [threshold, setThreshold] = useState(2)
  const [distance, setDistance] = useState(5)
  const [estimatedUnlockMinutes, setEstimatedUnlockMinutes] = useState(-1)

  const [decrypted, setDecrypted] = useState('')

  const TARGET = 10
  const CONTRACT_ADDR = "TODO";

  useEffect(() => {
    const setup = async () => {

      // testing out the tx-wrapper
      await cryptoWaitReady();
      const keyring = new Keyring();
	    const alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519');

      const { block } = await rpcToLocalNode('chain_getBlock');
      const blockHash = await rpcToLocalNode('chain_getBlockHash');
      const genesisHash = await rpcToLocalNode('chain_getBlockHash', [0]);
      const metadataRpc = await rpcToLocalNode('state_getMetadata');
      const { specVersion, transactionVersion, specName } = await rpcToLocalNode(
        'state_getRuntimeVersion'
      );
    
      // Create [TODO CHAIN NAME] type registry.
      const registry = getRegistry({
        chainName: 'ETF',
        specName,
        specVersion,
        metadataRpc,
      });
    

      let tx = create_unsigned_tx(
        alice, block, blockHash, genesisHash, registry, metadataRpc, transactionVersion, specVersion);
      console.log('your unsigned tx');
      console.log(tx);

      // const distanceBasedSlotScheduler = new DistanceBasedSlotScheduler()
      // let api = new Etf(distanceBasedSlotScheduler)
      // await api.init()
      // setApi(api)

      // api.eventEmitter.on('blockHeader', () => {
      //   setLatestSlot(api.latestSlot)
      // })
    }
    setup()
  }, [])

  const create_unsigned_tx = (
    alice, block, blockHash, genesisHash, registry, metadataRpc, transactionVersion, specVersion,
  ) => {
    const unsigned = methods.contracts.call(
      {
        dest: { id: '14E5nqKAp3oAJcmzgZhUD2RcptBeUBScxKHgJKU4HPNcKVf3' }, // Bob
        value: '90071992547409910',
        gas_limit: '90071992547409910',
        storage_deposit_limit: '90071992547409910',
        data: '',
      },
      {
        address: deriveAddress(alice.publicKey, 42), // TODO, use correct prefix
        blockHash,
        blockNumber: registry
          .createType('BlockNumber', block.header.number)
          .toNumber(),
        eraPeriod: 64,
        genesisHash,
        metadataRpc,
        nonce: 0, // Assuming this is Alice's first tx on the chain
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

  // useEffect(() => {
  //   setEstimatedUnlockMinutes(
  //     calculateEstimatedTime(distance, shares, threshold, TARGET)
  //   )
  // }, [distance, shares, threshold])

  // /**
  //  * Encrypt the current inputMessage textbox
  //  * @param {*} e
  //  */
  // async function encrypt(e) {
  //   e.preventDefault()
  //   let t = new TextEncoder()
  //   // we do not want to bind the message to the state
  //   const inputElement = document.getElementById('inputMessage')
  //   const inputMessage = inputElement.value
  //   let message = t.encode(inputMessage)
  //   inputElement.value = ''
  //   try {
  //     let out = api.encrypt(message, 3, 2, new TimeInput(5))

  //     let o = {
  //       ciphertext: out.ct.aes_ct.ciphertext,
  //       nonce: out.ct.aes_ct.nonce,
  //       capsule: out.ct.etf_ct,
  //       slotSchedule: out.slotSchedule,
  //     }
  //     let js = JSON.stringify(o)
  //     setEncryptedInfoList([cid, ...encryptedInfoList])
  //   } catch (e) {
  //     console.log(e)
  //   }
  // }

  // /**
  //  * Attempt to decrypt something
  //  * @param {*} ct
  //  * @param {*} nonce
  //  * @param {*} capsule
  //  * @param {*} ss
  //  */
  // async function decrypt(cid) {
  //   try {
  //     let o = []
  //     for await (const val of ipfs.cat(CID.parse(cid))) {
  //       o.push(val)
  //     }
  //     let data = concat(o)
  //     let js = JSON.parse(new TextDecoder().decode(data).toString())
  //     console.log(js.slotSchedule)
  //     let m = await api.decrypt(
  //       js.ciphertext,
  //       js.nonce,
  //       js.capsule,
  //       js.slotSchedule
  //     )
  //     let message = String.fromCharCode(...m)
  //     setDecrypted(message)
  //   } catch (e) {
  //     console.error(e)
  //   }
  // }

  // /*
  //  functions to calc estimated time to decryption
  // */
  // function calculateEstimatedTime(distance, shares, threshold, TARGET) {
  //   if (threshold === 0 || shares - threshold <= 0) {
  //     return 'Invalid threshold'
  //   }

  //   const probabilities = []
  //   const p = threshold / shares // Probability of finding a winning share in a slot

  //   for (let i = 0; i <= threshold; i++) {
  //     probabilities[i] =
  //       binomialCoefficient(shares, i) *
  //       Math.pow(p, i) *
  //       Math.pow(1 - p, shares - i)
  //   }

  //   let estimatedTime = 0

  //   for (let i = 1; i <= threshold; i++) {
  //     estimatedTime += i * probabilities[i]
  //   }

  //   return (estimatedTime * distance * TARGET) / 60
  // }

  // // Helper function to calculate binomial coefficient
  // function binomialCoefficient(n, k) {
  //   if (k === 0 || k === n) {
  //     return 1
  //   }

  //   let result = 1
  //   for (let i = 1; i <= k; i++) {
  //     result *= (n - i + 1) / i
  //   }

  //   return result
  // }

  return (
    <div className="App">
      <div className="header">
        Etf Futures Contract Example
        <div>
          Latest Slot:{' '}
          {latestSlot === null || latestSlot === undefined
            ? 'Loading...'
            : latestSlot.slot}
        </div>
      </div>
      <div className="body">

      </div>
    </div>
  )
}

export default App
