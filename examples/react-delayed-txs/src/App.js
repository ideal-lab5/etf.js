import { Etf, DistanceBasedSlotScheduler } from '@ideallabs/etf.js'
import './App.css'
import React, { useEffect, useState } from 'react'
import { CID, create } from 'ipfs-http-client'
import { concat } from 'uint8arrays'
import { Keyring } from '@polkadot/api';


import chainSpec from './resources/etfTestSpecRaw.json';
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { hexToU8a } from '@polkadot/util'

function App() {
  const [etf, setEtf] = useState(null)
  const [alice, setAlice] = useState(null)
  const [threshold, setThreshold] = useState(2)
  const [latestSlot, setLatestSlot] = useState(null)


  useEffect(() => {
    const setup = async () => {
      
      await cryptoWaitReady();
      let etf = new Etf("ws://127.0.0.1:9944")
      await etf.init()
      setEtf(etf)

      const keyring = new Keyring()
      const alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519')
      setAlice(alice)

      etf.eventEmitter.on('blockHeader', () => {
        setLatestSlot(etf.latestSlot)
      })
    }
    setup()
  }, [])

  /**
   * Encrypt the current inputMessage textbox
   * @param {*} e
   */
  async function encrypt() {
    // let rawCall = etf.api.tx.etf.updateIbeParams([], [], []);
    let rawCall = etf.api.tx.balances.transferKeepAlive('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', 1000);
    let call = etf.createType('Call', rawCall);
    
    // console.log(call.toU8a([true]))
    // console.log(call.toU8a());
    let latest = parseInt(latestSlot.slot.replaceAll(",", ""));
    let target = latest + 2;
    try {
      let out = etf.encrypt(call.toU8a(), threshold, [target], "testSeed")
      let o = {
        ciphertext: out.ct.aes_ct.ciphertext,
        nonce: out.ct.aes_ct.nonce,
        capsule: out.ct.etf_ct[0],
      };
      console.log(o)
      let diffSlots = target - latest;
      let targetBlock = etf.latestBlockNumber + diffSlots;
      console.log('submitting for ' + targetBlock);
      // and finally call the schedule endpoint
      await etf.api.tx.scheduler.scheduleSealed(
        targetBlock,
        127,
        o,
      ).signAndSend(alice, result => {
        if (result.status.isInBlock) {
          console.log('in block')
        }
      });

    } catch (e) {
      console.log(e)
    }
  }

  // /**
  //  * Attempt to decrypt something
  //  * @param {*} cid
  //  */
  // async function decrypt(cid) {
  //   try {
  //     let o = []
  //     for await (const val of ipfs.cat(CID.parse(cid))) {
  //       o.push(val)
  //     }
  //     let data = concat(o)
  //     let js = JSON.parse(new TextDecoder().decode(data).toString())
  //     console.log(js);
  //     let m = await api.decrypt(
  //       js.ciphertext,
  //       js.nonce,
  //       js.capsule,
  //       js.slotSchedule
  //     )
  //     let message = String.fromCharCode(...m)
  //     console.log(message);
  //     setDecrypted(message)
  //   } catch (e) {
  //     console.error(e)
  //   }
  // }

  return (
    <div className="App">
      <div className="header">
        EtF Js Example
        <div>
          Latest Block : {latestSlot === null ? 'Loading...' : latestSlot.slot}
        </div>
      </div>
      <div className="encrypt-body">
        <button
            className="button"
            type="submit"
            onClick={encrypt}
            value="Encrypt"
          >Encrypt</button>
      </div>
    </div>
  )
}

export default App
