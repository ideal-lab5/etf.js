import { Etf, Justfication } from '@ideallabs/etf.js'
import './App.css'
import React, { useEffect, useState } from 'react'

import chainSpec from './resources/etfTestSpecRaw.json';

function App() {
  const [etf, setEtf] = useState(null)

  const [latestSignature, setLatestSignature] = useState('');
  const [latestBlock, setLatestBlock] = useState(null)
  const [blockNumber, setBlockNumber] = useState(5)

  const [ciphertexts, setCiphertexts] = useState([]);

  const [decrypted, setDecrypted] = useState('')

  useEffect(() => {
    const setup = async () => {
      let etf = new Etf("ws://127.0.0.1:9944")
      await etf.init(chainSpec)
      setEtf(etf)

      // stream incoming justifications and use the signature
      etf.subscribeBeacon((justification) => {
        setLatestBlock(parseInt(justification.commitment.blockNumber.replace(",", "")))
        setLatestSignature(justification.signaturesCompact)
      });
    }
    setup()
  }, [])

  /**
   * Encrypt the current inputMessage textbox
   * @param {*} e
   */
  async function encrypt(e) {
    e.preventDefault();
    // we do not want to bind the message to the state
    const inputElement = document.getElementById('inputMessage')
    const inputMessage = inputElement.value
    inputElement.value = ''

    let deadline = parseInt(blockNumber);

    try {
      let out = await etf.timelockEncrypt(inputMessage, deadline, "testSeed")
      setCiphertexts([...ciphertexts, { ct: out, deadline }]);
    } catch (e) {
      console.log(e)
    }
  }

  /**
   * Attempt to decrypt something
   */
  async function decrypt(ciphertext, when) {
    try {
      let res = await etf.timelockDecrypt(ciphertext, when)
      let message = String.fromCharCode(...res)
      setDecrypted(message)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="App">
      <div className="header">
        ETF.js Timelock Encryption Example
      </div>
      <div className='body'>
        <div className='data-display'>
          <span>Latest Block { JSON.stringify(latestBlock) } </span>
          <span>Latest Signature { JSON.stringify(latestSignature) } </span>
        </div>
        <div className="ciphertext-display">
          Your encrypted messages
          {ciphertexts && ciphertexts.map((info, idx) => {
            return (
              <div key={idx} className="encrypted-message-data-display">
                <span>deadline: { info.deadline }</span>
                <button onClick={() => decrypt(info.ct, info.deadline)}>Decrypt</button>
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
            <label htmlFor="blocknumber">Block Number</label>
            <input
              id="block_number"
              type="number"
              onChange={(e) => setBlockNumber(e.target.value)}
              value={blockNumber}
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
    </div>
  )
}

export default App
