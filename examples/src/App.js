import { Etf, DistanceBasedSlotScheduler, TimeInput } from 'etf';
import './App.css';
import React, { useEffect, useState } from 'react';
import { CID, create } from 'ipfs-http-client';
import {concat} from 'uint8arrays'

function App() {
  const [api, setApi] = useState(null);
  const [ipfs, setIpfs] = useState(null);

  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('9944');
  
  const [latestSlot, setLatestSlot] = useState(null);
  const [encryptedInfoList, setEncryptedInfoList] = useState([]);
  const [shares, setShares] = useState(3);
  const [threshold, setThreshold] = useState(2);
  const [distance, setDistance] = useState(5);
  const [estimatedUnlockMinutes, setEstimatedUnlockMinutes] = useState(-1);

  const [decrypted, setDecrypted] = useState('');

  const TARGET = 10;

  useEffect(() => {
    const setup = async () => {
      const distanceBasedSlotScheduler = new DistanceBasedSlotScheduler();
      let api = new Etf(host, port, distanceBasedSlotScheduler);
      await api.init(true);
      setApi(api);
      
      document.addEventListener('blockHeader', () => {
        setLatestSlot(api.latestSlot);
      });
    }
    setup();
    handleIpfsConnect();
  }, []);

  const handleIpfsConnect = async() => {
    const ipfs = await create({
        host: "127.0.0.1",
        port: "5001",
        protocol: 'http',
    });
    setIpfs(ipfs);
}

  useEffect(() => {
    setEstimatedUnlockMinutes(
      calculateEstimatedTime(
        distance, shares, threshold, TARGET));
  }, [distance, shares, threshold]);

  /**
   * Encrypt the current inputMessage textbox
   * @param {*} e 
   */
  async function encrypt(e) {
    e.preventDefault();
    let t = new TextEncoder();
    // we do not want to bind the message to the state
    const inputElement = document.getElementById('inputMessage');
    const inputMessage = inputElement.value;
    let message = t.encode(inputMessage);
    // inputElement.value = '';
    try {
      let out = api.encrypt(message, 3, 2, new TimeInput(5));

      let o = {
        ciphertext: out.ct.aes_ct.ciphertext,
        nonce: out.ct.aes_ct.nonce,
        capsule: out.ct.etf_ct,
        slotSchedule: out.slotSchedule,
      };
      let js = JSON.stringify(o);
      let cid = await ipfs.add(js);
      setEncryptedInfoList([cid, ...encryptedInfoList])
    } catch(e) {
      console.log(e);
    }
  }

  /**
   * Attempt to decrypt something
   * @param {*} ct 
   * @param {*} nonce 
   * @param {*} capsule 
   * @param {*} ss 
   */
  async function decrypt(cid) {
    try {
      let o = [];
      for await (const val of ipfs.cat(CID.parse(cid))) {
        o.push(val);
      }
      let data = concat(o)
      let js = JSON.parse(new TextDecoder().decode(data).toString());
      console.log(js.slotSchedule);
      let m = await api.decrypt(js.ciphertext, js.nonce, js.capsule, js.slotSchedule);
      let message = String.fromCharCode(...m);
      setDecrypted(message);
    } catch (e) {
      console.error(e);
    }
  }

  /*
   functions to calc estimated time to decryption
  */

  function calculateEstimatedTime(distance, shares, threshold, TARGET) {
    if (threshold <= 0 || threshold > shares) {
        return "Invalid threshold";
    }

    const probabilities = [];
    const p = threshold / shares; // Probability of finding a winning share in a slot

    for (let i = 0; i <= threshold; i++) {
        probabilities[i] = binomialCoefficient(shares, i) * Math.pow(p, i) * Math.pow(1 - p, shares - i);
    }

    let estimatedTime = 0;

    for (let i = 1; i <= threshold; i++) {
        estimatedTime += i * probabilities[i];
    }

    return (estimatedTime * distance * TARGET) / 60;
}

// Helper function to calculate binomial coefficient
function binomialCoefficient(n, k) {
    if (k === 0 || k === n) {
        return 1;
    }
    
    let result = 1;
    for (let i = 1; i <= k; i++) {
        result *= (n - i + 1) / i;
    }

    return result;
}

  return (
    <div className="App">
      <div className='header'>
        EtF Js Example
        <div>
          Latest Slot: { latestSlot === null || latestSlot === undefined ? 'Loading...' : latestSlot.slot }
        </div>
      </div>
      <div className='data-display'>
        Your encrypted messages
        { encryptedInfoList.map((info, idx) => {
          return (
            <div key={idx} className='encrypted-message-data-display'>
              CID: { info.path }
              <button onClick={() => decrypt(info.path)}>Decrypt</button>

            </div>
          );
        }) }
        <div>
          {decrypted}
        </div>
      </div>
      <div className='encrypt-body'>
        <span>Write a message</span>
        <textarea id='inputMessage' name="secret-message" cols="40" rows="5"></textarea>
        <form className='form'>
          <label for="shares">Number of slots</label>
          <input id="shares" type='number' value={shares} onChange={(e) => setShares(e.target.value)} placeholder='' />
          <label for="threshold">Threshold</label>
          <input id="threshold" type='number' onChange={(e) => setThreshold(e.target.value)} value={threshold} placeholder='' />
          <label for="distance">Distance</label>
          <input id="distance" type='number' onChange={(e) => setDistance(e.target.value)} value={distance} placeholder='' />
          <input className='button' type='submit' onClick={encrypt} value="Encrypt" />
          <span>
            Estimated time to decryption (minutes): { estimatedUnlockMinutes } 
          </span>
        </form>
      </div>
    </div>
  );
}

export default App;
 