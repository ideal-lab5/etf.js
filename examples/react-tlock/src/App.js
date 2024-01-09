import { Etf, DistanceBasedSlotScheduler } from '@ideallabs/etf.js'
import './App.css'
import React, { useEffect, useState } from 'react'
import { CID, create } from 'ipfs-http-client'
import { concat } from 'uint8arrays'

import chainSpec from './resources/etfTestSpecRaw.json';

function App() {
  const [etf, setEtf] = useState(null)
  const [ipfs, setIpfs] = useState(null)

  const [latestSlot, setLatestSlot] = useState(null)
  const [encryptedInfoList, setEncryptedInfoList] = useState([])
  const [shares, setShares] = useState(3)
  const [threshold, setThreshold] = useState(2)
  const [distance, setDistance] = useState(5)
  const [estimatedUnlockMinutes, setEstimatedUnlockMinutes] = useState(-1)

  const [decrypted, setDecrypted] = useState('')

  const TARGET = 10

  useEffect(() => {
    const setup = async () => {

      let etf = new Etf("wss://etf1.idealabs.network:443")
      // let api = new Etf("ws://127.0.0.1:9944")
      await etf.init(chainSpec)
      setEtf(etf)

      etf.eventEmitter.on('blockHeader', () => {
        setLatestSlot(etf.latestSlot)
      })
    }
    setup()
    handleIpfsConnect()
  }, [])

  const handleIpfsConnect = async () => {
    const ipfs = await create({
      host: '127.0.0.1',
      port: '5001',
      protocol: 'http',
    })
    setIpfs(ipfs)
  }

  /**
   * Encrypt the current inputMessage textbox
   * @param {*} e
   */
  async function encrypt(e) {
    e.preventDefault()
    let t = new TextEncoder()
    // we do not want to bind the message to the state
    const inputElement = document.getElementById('inputMessage')
    const inputMessage = inputElement.value
    inputElement.value = ''
    // slots increase by 2
    let slotSchedule = [parseInt(latestSlot.slot.replaceAll(",", "")) + 2 * distance]
    try {
      let out = etf.encrypt(t.encode(inputMessage), threshold, slotSchedule, "testSeed")
      let o = {
        ciphertext: out.aes_ct.ciphertext,
        nonce: out.aes_ct.nonce,
        capsule: out.etf_ct,
        slotSchedule: slotSchedule,
      }
      let js = JSON.stringify(o)
      let cid = await ipfs.add(js)
      setEncryptedInfoList([cid, ...encryptedInfoList])
    } catch (e) {
      console.log(e)
    }
  }

  /**
   * Attempt to decrypt something
   * @param {*} cid
   */
  async function decrypt(cid) {
    try {
      let o = []
      for await (const val of ipfs.cat(CID.parse(cid))) {
        o.push(val)
      }
      let data = concat(o)
      let js = JSON.parse(new TextDecoder().decode(data).toString())
      console.log(js);
      let res = await etf.decrypt(
        js.ciphertext,
        js.nonce,
        js.capsule,
        js.slotSchedule
      )
      let message = String.fromCharCode(...res.message)
      setDecrypted(message)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="App">
      <div className="header">
        EtF Js Example
        <div>
          Latest Slot:{' '}
          {latestSlot === null || latestSlot === undefined
            ? 'Loading...'
            : latestSlot.slot}
        </div>
      </div>
      <div className="data-display">
        Your encrypted messages
        {encryptedInfoList.map((info, idx) => {
          return (
            <div key={idx} className="encrypted-message-data-display">
              CID: {info.path}
              <button onClick={() => decrypt(info.path)}>Decrypt</button>
            </div>
          )
        })}
        <div>{decrypted}</div>
      </div>
      <div className="encrypt-body">
        <span>Write a message</span>
        <textarea
          id="inputMessage"
          name="secret-message"
          cols="40"
          rows="5"
        ></textarea>
        <form className="form">
          <label htmlFor="distance">Distance</label>
          <input
            id="distance"
            type="number"
            onChange={(e) => setDistance(e.target.value)}
            value={distance}
            placeholder=""
          />
          <input
            className="button"
            type="submit"
            onClick={encrypt}
            value="Encrypt"
          />
        </form>
      </div>
    </div>
  )
}

export default App
