import { Etf, DistanceBasedSlotScheduler } from '@ideallabs/etf.js'
import './App.css'
import React, { useCallback, useEffect, useState } from 'react'
import { Keyring } from '@polkadot/api';


import chainSpec from './resources/etfTestSpecRaw.json';
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { hexToU8a } from '@polkadot/util'
import { EtfContext } from './EtfContext';
import WalletConnect from './components/connect/connect.component';

function App() {
  const [etf, setEtf] = useState(null)
  const [alice, setAlice] = useState(null)
  const [threshold, setThreshold] = useState(2)
  const [latestSlot, setLatestSlot] = useState(null)
  const [signer, setSigner] = useState(null);

  const handleSignerChange = useCallback((newSigner) => {
    setSigner(newSigner)
 }, []);


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
  async function delay() {
    // the call to delay
    let innerCall = etf.api.tx.balances
      .transferKeepAlive('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', 100);
    // calculate a deadline (slot)
    let latest = parseInt(latestSlot.slot.replaceAll(",", ""));
    let deadline = latest + 2;
    // prepare delayed call
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
        Transmutation
        <div>
          Latest Block : {latestSlot === null ? 'Loading...' : latestSlot.slot}
        </div>
      </div>
      <div className="encrypt-body">
        <div className='wallet-component'>
          { etf === null ? 
          <div>
            <span>Loading...</span>
          </div> :
          <div>
            <span onClick={() => navigator.clipboard.writeText(
              latestSlot === null ? '' : latestSlot.slot)} className='clickable'>
                Current slot: { latestSlot.slot }
            </span>
            <EtfContext.Provider value={{etf, signer}} >
              <WalletConnect setSigner={handleSignerChange} />
            </EtfContext.Provider>
          </div>
          }
        </div>
      </div>
    </div>
  )
}

export default App
