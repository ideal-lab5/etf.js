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
    let rawCall = etf.api.tx.balances.transferKeepAlive('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', 1000);
    let innerCall = etf.createType('Call', rawCall);
    // calculate a slot + block deadline 
    let latest = parseInt(latestSlot.slot.replaceAll(",", ""));
    let deadline = latest + 2;

    let outerCall = etf.delay(innerCall, 127, deadline);
    await outerCall.signAndSend(alice, result => {
      if (result.status.isInBlock) {
        console.log('in block')
      }
    });
  }

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
