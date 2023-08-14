import { Etf, DistanceBasedSlotScheduler, TimeInput } from 'etf';
import './App.css';

import React, { useEffect, useState } from 'react';

function App() {
  const [api, setApi] = useState(null);
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('9944');

  const [currentCt, setCurrentCt] = useState(null);
  const [ss, setCurrentSS] = useState(null);

  useEffect(() => {
    const setup = async () => {
      const distanceBasedSlotScheduler = new DistanceBasedSlotScheduler();
      let api = new Etf(host, port, distanceBasedSlotScheduler);
      await api.init();
      setApi(api);
      
      // document.addEventListener('blockHeader', (data) => {
      //   console.log(data.detail.slot);
      //   console.log(data.detail.secret);
      // });

    }
    setup();
  }, []);

  function etfTest() {
    let t = new TextEncoder();
    let message = t.encode("hello world");
    try {
      let out = api.encrypt(message, 3, 2, new TimeInput(5));
      console.log('Encryption success');
      setCurrentCt(out.ct);
      setCurrentSS(out.slotSchedule);
      console.log(JSON.stringify(out.slotSchedule.slotIds));
    } catch(e) {
      console.log(e);
    }
  }

  async function dffTest() {
    try {
      let m = await api.decrypt(
        currentCt.aes_ct.ciphertext, 
        currentCt.aes_ct.nonce, 
        currentCt.etf_ct, 
        ss
      );
      console.log(String.fromCharCode(...m));
    } catch (e) {
      console.error(e);
    }
  }
  
  return (
    <div className="App">
      <div className='header'>
        EtF Js Example
      </div>
      <div>
        <button onClick={etfTest}>Encrypt Test</button>
        <button onClick={dffTest}>Decryption Test</button>
      </div>
    </div>
  );
}

export default App;
 