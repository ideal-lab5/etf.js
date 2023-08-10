import './App.css';

import React, { useEffect, useState } from 'react';
import Etf from 'etf';
// TODO: use extension to get account
// https://polkadot.js.org/docs/extension/usage/
function App() {
  const [api, setApi] = useState(null);
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('9944');

  const [slotSecrets, setSlotSecrets] = useState([]) ;
  const [historyDepth, setHistoryDepth] = useState(10);

  useEffect(() => {
    const setup = async () => {
      let api = new Etf(host, port);
      await api.init();
      setApi(api);
      // listen for blockHeader events
      document.addEventListener('blockHeader', (data) => {
        let details = data.detail;
        setSlotSecrets(slotSecrets => [...slotSecrets, details]);
      });
      
    }
    setup();
    return () => {
      document.removeEventListener('blockHeader');
    }
  }, []);

  function etfTest() {
    let t = new TextEncoder();
    let ids = [
      t.encode(slotSecrets.slice(-1)[0].slot.replaceAll(",", ""))
    ];

    let message = t.encode("hello world");
    let threshold = 1;

    try {
      let ct = api.encrypt(message, ids, threshold);
      let sk = hexToBytes(slotSecrets.slice(-1)[0].secret.substring(2));
      let plaintext = api.decrypt(
          ct.aes_ct.ciphertext, 
          ct.aes_ct.nonce, 
          ct.etf_ct, [sk]);
      console.log(String.fromCharCode(...plaintext));
    } catch(e) {
      console.log(e);
    }
  }

  function hexToBytes(hex) {
    let bytes = [];
    for (let c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
  }
  
  return (
    <div className="App">
      <div className='header'>
        EtF Network Monitor Tool
      </div>
      <button onClick={etfTest}>Test</button>
      {/* <table className='table'>
        <thead>
          <tr>
            <th>Slot #</th>
            <th>Slot Secret</th>
          </tr>
        </thead>
        <tbody>
        { slotSecrets.map((s, i) => {
          return <tr key = {i}>
            <td>
              { s.slot }
            </td>
            <td>
              { s.secret }
            </td>
          </tr>
        })}
        </tbody>
      </table> */}
    </div>
  );
}

export default App;
 