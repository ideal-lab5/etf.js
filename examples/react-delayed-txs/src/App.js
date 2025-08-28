import { Etf } from '@ideallabs/etf.js'
import './App.css'
import React, { useEffect, useState } from 'react'
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'

function App() {
  const [etf, setEtf] = useState(null)
  const [alice, setAlice] = useState(null)

  const PUBKEY =
    '83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a'

  useEffect(() => {
    const setup = async () => {
      await cryptoWaitReady()

      let wsProvider = new WsProvider('ws://127.0.0.1:9933')
      let api = await ApiPromise.create({ provider: wsProvider })
      let etf = new Etf(api, PUBKEY)
      await etf.build()
      setEtf(etf)

      const keyring = new Keyring()
      const alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519')
      setAlice(alice)
    }

    setup()
  }, [])

  /**
   * Encrypt the current inputMessage textbox
   */
  async function delay() {
    // the call to delay
    let balanceTransfer = etf.api.tx.balances.transferKeepAlive(
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      1_000_000_000
    )
    let deadline = await etf.getDrandRoundNumber()
    // 60 seconds
    deadline += 4
    console.log('deadline: ' + deadline)
    // prepare delayed call
    etf.delay(balanceTransfer, deadline, 'testSeed').then(async (outerCall) => {
      console.log(
        'delayed call created: ' + JSON.stringify(outerCall.toHuman())
      )
      await outerCall.signAndSend(alice, (result) => {
        if (result.status.isInBlock) {
          console.log('in block')
        }
      })
    })
  }

  return (
    <div className="App">
      <div className="header">Delayed Transactions Balance Transfer</div>
      <div className="encrypt-body">
        <button
          className="button"
          type="submit"
          onClick={delay}
          value="Encrypt"
        >
          Encrypt
        </button>
      </div>
    </div>
  )
}

export default App
