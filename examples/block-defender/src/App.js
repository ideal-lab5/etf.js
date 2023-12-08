/* global BigInt */
import './App.css';
import WalletConnect from './components/connect/connect.component';
import GameScreen from './components/game-screen/game-screen.component';
import { useEffect, useState, useCallback } from 'react';
import chainSpec from './resources/etfDevSpecRaw.json';
import { Etf } from '@ideallabs/etf.js';
import { EtfContext } from './EtfContext';

function App() {

  const [signer, setSigner] = useState(null);
  const [etf, setEtf] = useState(null);
  const [latestSlot, setLatestSlot] = useState(0);
  // const [balance, setBalance] = useState(0);

  const handleSignerChange = useCallback((newSigner) => {
    setSigner(newSigner)
 }, []);

  const CUSTOM_TYPES = {
    TlockMessage: {
      ciphertext: 'Vec<u8>',
      nonce: 'Vec<u8>',
      capsule: 'Vec<u8>',
      commitment: 'Vec<u8>',
    },
    PlayerBase: {
      iron: 'u32',
      attackPoints: 'u32',
      defensePoints: 'u32',
      xCoord: 'u8',
      yCoord: 'u8',
    }
  };

  useEffect(() => {
    const setup = async () => {
      // let etf = new Etf("wss://etf1.idealabs.network:443")
      let etf = new Etf("ws://localhost:9944")
      await etf.init(chainSpec, CUSTOM_TYPES)
      setEtf(etf)
      etf.eventEmitter.on('blockHeader', () => {
        setLatestSlot(etf.latestSlot)
      })
    }
    setup()
}, [])

  return (
    <div className="App">
      <header className="App-header">
        <span className='App-title'>Block Defender</span>
        <div className='wallet-component'>
          { etf === null ? 
          <div>
            <span>Loading...</span>
          </div> :
          <EtfContext.Provider value={{etf, signer}} >
            <WalletConnect setSigner={handleSignerChange} />
          </EtfContext.Provider>
          }
        </div>
      </header>
      <div className="App-body">
        {signer === null ? <div></div> : 
        <EtfContext.Provider value={{etf, signer, latestSlot}} >
          <GameScreen />
        </EtfContext.Provider>
        }
      </div>
      
    </div>
  );
}

export default App;
