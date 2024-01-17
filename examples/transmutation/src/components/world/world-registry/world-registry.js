import React, { useContext, useEffect, useState } from 'react';
import { EtfContext } from '../../../EtfContext';
import './world-registry.css';

import {queryAssetOwner, queryClaimedAssets} from '../../../services/transmutation.service';
import { Link, useNavigate } from 'react-router-dom';
import { hexToString, hexToU8a } from '@polkadot/util';

function WorldRegistry() {


   const navigate = useNavigate();

   const { etf, signer, contract, latestSlot } = useContext(EtfContext);
   
   const [knownAssetIds, setKnownAssetIds] = useState([]);

   useEffect(() => {
      handleQueryClaimedAssets();
   }, []);

   const handleQueryClaimedAssets = async () => {
      let output = await queryClaimedAssets(etf, signer, contract);
      setKnownAssetIds(output.Ok);
   }

   const handleNavigateToWorldView = async (seed) => {
      let owner = await handleQueryOwner(seed);
      navigate(`/${owner.Ok}`);
   }

   const handleQueryOwner = async (seed) => {
      let result = await queryAssetOwner(etf, signer, contract, seed);
      return result;
   }

   return (
   <div className='world-registry-component'>
      World Registry
      <div className='world-registry-body'>
         <table>
            <thead>
               <tr>
                  <th>
                     Seed
                  </th>
                  <th>
                     Details
                  </th>
               </tr>
            </thead>
            <tbody>
               { knownAssetIds.map((item, idx) => {
                  return (
                     <tr key={idx}>
                        <td>
                           { item.slice(0, 5) + '...' + item.slice(item.length - 4) }
                        </td>
                        <td>
                           <button onClick={() => handleNavigateToWorldView(item)}>
                              Details
                           </button>
                        </td>
                     </tr>
                  );
               }) }
            </tbody>
         </table>
      </div>
   </div>
   );
};

export default WorldRegistry;
