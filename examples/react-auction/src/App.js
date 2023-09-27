/* global BigInt */
import React, { useEffect, useState } from 'react'
import { Etf } from '@ideallabs/etf.js'
import './App.css'

import { Keyring } from '@polkadot/api';
import { ContractPromise, CodePromise } from '@polkadot/api-contract';
import { blake2AsHex, cryptoWaitReady } from '@polkadot/util-crypto';

import { SHA3 } from 'sha3';

import { construct, decode, deriveAddress, getRegistry, methods } from '@ideallabs/txwrapper-etf';
import { signWith } from './util';

import { BN, BN_ONE } from "@polkadot/util";

import contractMetadata from './resources/proxy/tlock_proxy.json';
import contractData from './resources/proxy/tlock_proxy.contract.json';
import { setConstantValue } from 'typescript';

// import proxyContractMetadata from './resources/proxy/tlock_proxy.json';

function App() {

  const MAX_CALL_WEIGHT2 = new BN(1_000_000_000_000).isub(BN_ONE);
  const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE);
  const PROOFSIZE = new BN(1_000_000_000);

  const PROXY_CONTRACT_ADDR = "5DoJSZyRFV1a7GujYdWfAahhEhnUESW9FFeWj1HtrpDbzpx3";

  const [api, setApi] = useState(null);
  const [alice, setAlice] = useState(null);

  const [contract, setContract] = useState(null);
  const [auctionContractId, setAuctionContractId] = useState('');
  const [auctionReady, setAuctionReady] = useState(false);

  const [slots, setSlots] = useState([]);

  useEffect(() => {
    const setup = async () => {
      await cryptoWaitReady()
      let api = new Etf('localhost', 9944)
      await api.init()
      setApi(api);
      const keyring = new Keyring();

      // const { specVersion, transactionVersion, specName } = await api.api.rpc.state.getRuntimeVersion();
      // setSpecVersion(transactionVersion);
      // setTransactionVersion(transactionVersion);

      // let metadata = await api.api.rpc.state.getMetadata()
      // // let magicNumber = metadata.get('magicNumber').toHex()
      // let metadataRpc = '0x6d657461' + metadata.get('metadata').toHex().substring(2)

      // setMetadataRpc(metadataRpc);

      // const registry = getRegistry({
      //   chainName: 'ETF',
      //   specName,
      //   specVersion,
      //   metadataRpc,
      // })
      // setRegistry(registry)

      // load the proxy contract
      const contract = new ContractPromise(api.api, contractMetadata, PROXY_CONTRACT_ADDR);
      setContract(contract)      

      const alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519')
      setAlice(alice)
    }
    setup()
  }, [])

  const newAuction = async(name, assetId, deadline, deposit) => {
     // now we want to call the publish function of the contract
     // call the publish function of the contract
     await contract.tx
       .newAuction({
         gasLimit: api.api.registry.createType('WeightV2', {
           refTime: MAX_CALL_WEIGHT2,
           proofSize: PROOFSIZE,
         }),
         storageDepositLimit: null,
       },
        name, 
        assetId, 
        deadline, 
        deposit,
       ).signAndSend(alice, result => {
         if (result.status.isInBlock) {
          console.log(result.toHuman().Ok)
          console.log('auction created');
         } else if (result.status.isFinalized) {
           console.log('finalized');
         }
       });
 
  }

  const loadAuction = async(accountId) => {
    const storageDepositLimit = null
    // https://substrate.stackexchange.com/questions/6401/smart-contract-function-call-error
    const { gasRequired, storageDeposit, result, output } = await contract.query.getAuctionDetails(
      alice.address,
      {
        gasLimit: api?.registry.createType('WeightV2', {
          refTime: MAX_CALL_WEIGHT,
          proofSize: PROOFSIZE,
        }),
        storageDepositLimit,
      },
      accountId,
    );

    // check if err
    console.log(result.toHuman())
    setAuctionReady(true)
    setAuctionContractId(accountId)
  }

  const proposeBid = async() => {
    // e.preventDefault()
    // we do not want to bind the message to the state
    const inputElement = document.getElementById('bid')
    const hasher = new SHA3(256)
    hasher.update(inputElement.value)
    const hash = hasher.digest();
    // the seed shouldn't be reused 
    let timelockedBid = api.encrypt(inputElement.value, 1, slots, "testing234");
    // now we want to call the publish function of the contract
    const value = 1000000;
    // call the publish function of the contract
    await contract.tx
      .bid({
        gasLimit: api.api.registry.createType('WeightV2', {
          refTime: MAX_CALL_WEIGHT2,
          proofSize: PROOFSIZE,
        }),
        storageDepositLimit: null,
        value: value,
      },
        auctionContractId,
        timelockedBid.ct.aes_ct.ciphertext,
        timelockedBid.ct.aes_ct.nonce,
        timelockedBid.ct.etf_ct[0],
        Array.from(hash),
      ).signAndSend(alice, result => {
        if (result.status.isInBlock) {
          console.log('in a block');
          console.log(result.toHuman().Ok);
        } else if (result.status.isFinalized) {
          console.log('finalized');
        }
      });

  }

  const doComplete = async () => {
    let secrets = await api.secrets(slots);
    // P \in G2
    let ibePubkey = Array.from(api.ibePubkey);
    console.log(ibePubkey)
    console.log(Array.from(secrets[0]));


    // fetch ciphertexts from the appropriate auction contract and decrypt them

    await contract.tx
      .complete({
        gasLimit: api.api.registry.createType('WeightV2', {
          refTime: new BN(1_290_000_000_000),
          proofSize: new BN(5_000_000_000_000),
        }),
        storageDepositLimit: null,
      }, 
        ibePubkey, 
        Array.from(secrets[0])
      ).signAndSend(alice, result => {
        if (result.isErr) {
          const errorMsg = result.toJSON();
          console.log(errorMsg)
        }
        if (result.status.isInBlock) {
          console.log('in a block');
          console.log(result.toHuman());
        } else if (result.status.isFinalized) {
          console.log('finalized');
        }
      });
  }

  const CreateAuctionForm = () => {

    const [name, setName] = useState('');
    const [deadline, setDeadline] = useState(0);
    const [assetId, setAssetId] = useState(0);
    const [deposit, setDeposit] = useState(0);

    return (
      <div>
        <h1>Create Auction</h1>
        <div className='form'>
          <input type="text" placeholder='name' onChange={(e) => setName(e.target.value)} />
          <input type="number" placeholder='deadline' onChange={(e) => setDeadline(e.target.value)} />
          <input type="number" placeholder='assetId' onChange={(e) => setAssetId(e.target.value)} />
          <div>
            <input type="number" placeholder='deposit' onChange={(e) => setDeposit(e.target.value)} /> ETF
          </div>
          <button onClick={() => newAuction(
            name, assetId, deadline, deposit
          )}>Deploy</button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="header">
        Etf Auction Contract Example
        <div>
        { api === null ? '' : JSON.stringify(api.latestSlot) }
        </div>
      </div>
      <div className="body">
        <div>
          <CreateAuctionForm />
        </div>
        { auctionReady === false ? 
        <div>
          <h1>Search Auctions</h1>
          <span>Enter an auction contract account id</span>
          <div>
            <input type="text" placeholder='5gx621a4...' onChange={(e) => setAuctionContractId(e.target.value)} />
            <button onClick={() => loadAuction(auctionContractId)}>Load Auction</button>
          </div>
        </div> :
        <div>
          <div>
            <input type='number' placeholder='100' id='bid' /> Unit
          </div>
          <button onClick={proposeBid}>Propose Bid</button>
        </div>
        }
        {/* <button onClick={doComplete}>Complete Auction</button> */}
      </div>
    </div>
  )
}

export default App
