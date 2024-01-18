import React, { Suspense, useContext, useEffect, useState } from 'react';
import { EtfContext } from '../../../EtfContext';
import './world-view.css';

import { queryWorldRegistry } from '../../../services/transmutation.service';
import CreateWorld from '../create-world/create-world';
import { Canvas, useThree } from '@react-three/fiber';
import Controls from '../../controls';
import Scene from '../../scene';
import { SHA3 } from 'sha3';
import seedrandom from 'seedrandom';
import Lights from '../../Lights';
import { useNavigate, useParams } from 'react-router-dom';
// import Lights from '../../scene/lights';
import useHexagonScatter from '../../../hooks/useHexagonScatter';
import appState from '../../../state/appState';
import GUI from '../../GUI';
import Effects from '../../../Effects';
import Terrain from '../../ScatterHexagonMesh';
import { PCFShadowMap, sRGBEncoding } from 'three';
import { Environment, OrbitControls } from '@react-three/drei';
import Trees from '../../Trees';
import Grass from '../../Grass';
import Clouds from '../../Clouds';
import Helpers from '../../../utils/Helpers';

function WorldView() {

   let { accountId } = useParams();

   const points = useHexagonScatter(25);
   const general = appState((s) => s.general);
   const setGenerationSeed = appState((s) => s.setSeed);
   const setGeneral = appState((s) => s.setGeneral);
   const setGeneration = appState((s) => s.setGeneration);

   const { etf, signer, contract, latestSlot } = useContext(EtfContext);
   const [seed, setSeed] = useState('');
   const [account, setAccount] = useState('');
   // the data returned when there is no world 
   const NOWORLD = "0x0000";

   const [style, setStyle] = useState('Perlin');

   useEffect(() => {
      setAccount(account);
   }, [accountId]);

   useEffect(() => {
      queryWorld();
   }, []);

   const queryWorld = async () => {
      // console.log('hey')
      let validity = isValid(accountId);
      let account = bitwiseCmp(validity, new Uint8Array(32).fill(0)) ?
         signer.address : validity;
      let output = await queryWorldRegistry(
         etf, signer, contract, account);
      if (output.Ok) {
         let data = output.Ok.data;
         // console.log('updating generation with data ' + data);
         let rng = csprngFromSeed(data);
         setGenerationSeed(rng());
         setGeneral('Trees', rng());
         // setGeneration('Trees', rng());
         setGeneral('Grass', rng());
         setGeneral('Water', rng());
         setGeneral('Clouds', rng());
         // setGeneral('Clouds');
         // setGeneration('Clouds', rng());
         setSeed(data);
      }
   }

   const isValid = (account) => {
      try {
         return etf.createType('AccountId', account);
      } catch (e) {
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

   const csprngFromSeed = (seed) => {
      const hash = new SHA3(512);
      // we need to go from 48 bytes to 32
      hash.update(seed);
      let out = hash.digest();
      let csprng = seedrandom(out);
      return csprng;
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
            {seed === '' || seed === NOWORLD ? <div><CreateWorld callback={queryWorld} /></div> :
               <div>
                  <span>Owner: </span>
                  <span>{accountId === undefined ? signer.address : accountId}</span>
                  <div>
                     <span>Seed: </span>
                     <span>{seed}</span>
                  </div>
                  <div className='toggle-container'>
                     <label className='toggle-label' htmlFor='toggle'>Perlin</label>
                     <input type='checkbox' id='toggle' onChange={() => {
                        if (style === 'Perlin') {
                           setStyle('Hex');
                        } else {
                           setStyle('Perlin');
                        }
                     }} />
                     <label className='toggle-label' htmlFor='toggle'>Hex</label>
                  </div>
                  {style === 'Perlin' ?
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
                     :
                     <div className='canvas-container'>
                        {/* <GUI /> */}
                        <Canvas
                           shadows
                           gl={{
                              antialias: true,
                              toneMappingExposure: 0.5,
                              shadowMap: {
                                 enabled: true,
                                 type: PCFShadowMap
                              },
                              outputEncoding: sRGBEncoding
                           }}
                           camera={{ zoom: 30, position: [0, 50, 100] }}
                        >
                           <Suspense fallback={null}>
                              <group rotation-x={-Math.PI / 2}>
                                 {general.Trees && <Trees points={points} />}
                                 {general.Grass && <Grass points={points} />}
                                 {general.Clouds && <Clouds />}
                                 <Terrain points={points} />
                              </group>
                              <Environment preset="sunset" />
                              <OrbitControls autoRotate autoRotateSpeed={0.6} enablePan={false} />
                              {/* <Helpers /> */}
                              <Effects />
                              {/* <Stats /> */}
                           </Suspense>
                           <Lights />
                        </Canvas>
                     </div>
                  }
               </div>
            }
         </div>
      </div>
   );
};

export default WorldView;
