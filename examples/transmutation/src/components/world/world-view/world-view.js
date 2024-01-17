import React, { Suspense, useContext, useEffect, useState } from 'react';
import { EtfContext } from '../../../EtfContext';
import './world-view.css';

import {queryWorldRegistry} from '../../../services/transmutation.service';
import CreateWorld from '../create-world/create-world';
import { Canvas, useThree } from '@react-three/fiber';
import Controls from '../../controls';
import Scene from '../../scene';
import { SHA3 } from 'sha3';
import seedrandom from 'seedrandom';
import Lights from '../../scene/lights';
import { useNavigate, useParams } from 'react-router-dom';
// import Lights from '../../scene/lights';

function WorldView() {


   let { accountId } = useParams();

   const { etf, signer, contract, latestSlot } = useContext(EtfContext);
   const [seed, setSeed] = useState('');
   const [account, setAccount] = useState('');
   // the data returned when there is no world 
   const NOWORLD = "0x0000";

   useEffect(() => {
      setAccount(account);
   }, [accountId]);

   useEffect(() => {
      queryWorld();
   }, []);

   const queryWorld = async () => {
      let validity = isValid(accountId);
      let account = bitwiseCmp(validity, new Uint8Array(32).fill(0)) ? 
            signer.address : validity;
      let output = await queryWorldRegistry(
            etf, signer, contract, account);
      if (output.Ok) {
         setSeed(output.Ok.data);
      }
   }

   const isValid = (account) => {      
      try {
         return etf.createType('AccountId', account);
      } catch(e) {
         return new Uint8Array(32).fill(0);
      }  
   }

   function bitwiseCmp(array1, array2) {
      if (array1.length !== array2.length) {
        return false;
      }
    
      for (let i = 0; i < array1.length; i++) {
        if (array1[i] !== array2[i]) {
          return false;
        }
      }
    
      return true;
    }

   const randomFromSeed = (seed) => {
      const hash = new SHA3(512);
      // we need to go from 48 bytes to 32
      hash.update(seed);
      let out = hash.digest();
      let csprng = seedrandom(out);
      let rand = csprng().toString();
      return rand;
   }

   return (
   <div className='your-world-container'>
      World View
      <div className='your-world-body'>
        { seed === '' || seed === NOWORLD ? <div><CreateWorld callback={queryWorld}/></div> :
         <div>
            <span>Owner: </span>
            <span>{ accountId === undefined ? signer.address : accountId }</span>
            <div>
               <span>Seed: </span>
               <span>{ seed }</span>
            </div>
            <div className='canvas-container'>
               <Canvas camera={{ zoom: 30, position: [0, 0, 600] }}>
               <Suspense
                  fallback={<span>Loading...</span>}
               >
                  <Lights />
                  <Controls />
                  <Scene seed={randomFromSeed(seed)} />
               </Suspense>
               </Canvas>
            </div>
         </div>
      }
      </div>
   </div>
   );
};

export default WorldView;
