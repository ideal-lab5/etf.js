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

import contractMetadata from './resources/timelock_auction.json';
import contractWasm from './resources/timelock_auction.wasm';

function App() {

  const MAX_CALL_WEIGHT2 = new BN(1_000_000_000_000).isub(BN_ONE);
  const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE);
  const PROOFSIZE = new BN(1_000_000_000);

  const [api, setApi] = useState(null);
  const [alice, setAlice] = useState(null);
  const [contract, setContract] = useState(null);
  const [contractAddr, setContractAddr] = useState("5FuUvayWSWZnqtCoqT6FZjAGVatFgijAAfYQZLsuW95cQ82L");
  const [registry, setRegistry] = useState(null);
  const [specVersion, setSpecVersion] = useState(null);
  const [metadataRpc, setMetadataRpc] = useState(null);
  const [transactionVersion, setTransactionVersion] = useState(null);

  const [slots, setSlots] = useState([]);

  useEffect(() => {
    const setup = async () => {
      await cryptoWaitReady()
      let api = new Etf()
      await api.init()
      setApi(api);
      const keyring = new Keyring();

      const { specVersion, transactionVersion, specName } = await api.api.rpc.state.getRuntimeVersion();
      setSpecVersion(transactionVersion);
      setTransactionVersion(transactionVersion);

      let metadata = await api.api.rpc.state.getMetadata()
      // let magicNumber = metadata.get('magicNumber').toHex()
      let metadataRpc = '0x6d657461' + metadata.get('metadata').toHex().substring(2)

      setMetadataRpc(metadataRpc);

      const registry = getRegistry({
        chainName: 'ETF',
        specName,
        specVersion,
        metadataRpc,
      })
      setRegistry(registry)

      const alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519')
      setAlice(alice)
      // a limit to how much Balance to be used to pay for the storage created by the contract call
      // if null is passed, unlimited balance can be used
      // const contract = new ContractPromise(api.api, contractMetadata, contractAddr);
      // setContract(contract)
      // const storageDepositLimit = null
      // // https://substrate.stackexchange.com/questions/6401/smart-contract-function-call-error
      // const { gasRequired, storageDeposit, result, output } = await contract.query.getDeadline(
      //   alice.address,
      //   {
      //     gasLimit: api?.registry.createType('WeightV2', {
      //       refTime: MAX_CALL_WEIGHT,
      //       proofSize: PROOFSIZE,
      //     }),
      //     storageDepositLimit,
      //   }
      // );

      // // load the contract
      // let slot = output.toHuman().Ok;
      // setSlots([Number.parseInt(slot.replaceAll(",", ""))])

    }
    setup()
  }, [])

  /**
   * Builds a signed tx
   * @param {*} api 
   * @param {*} alice 
   * @param {*} amount 
   * @returns 
   */
  const build_transaction = async (api, alice, amount) => {
    let blockHash = await api.api.query.system.blockHash(api.latestBlockNumber)
    let genesisHash = await api.api.query.system.blockHash(0)

    let unsigned =
      create_unsigned_tx(
        alice, contractAddr,
        buildBidData(amount),
        api.latestBlockNumber,
        blockHash,
        genesisHash,
        registry,
        metadataRpc,
        transactionVersion,
        specVersion
      )

    let signed = create_signed_tx(
      alice, unsigned, registry, metadataRpc
    );
    return signed;
  }

  /**
   * 
   * See: Ethereum forwarding contract
   * 
   * Creates an unsigned transaction
   * @param {*} alice 
   * @param {*} dest 
   * @param {*} data 
   * @param {*} blockNumber 
   * @param {*} blockHash 
   * @param {*} genesisHash 
   * @param {*} registry 
   * @param {*} metadataRpc 
   * @param {*} transactionVersion 
   * @param {*} specVersion 
   * @returns 
   */
  const create_unsigned_tx = (
    alice, dest, data, blockNumber, blockHash, genesisHash, registry, metadataRpc, transactionVersion, specVersion,
  ) => {
    console.log(data);
    const unsigned = methods.contracts.call(
      {
        dest: { id: dest },
        value: 1,
        gasLimit: {
          "refTime": 0, // how to estimate?
          "proofSize": 0,
        },
        storageDepositLimit: 900719920,
        data: data
      },
      {
        address: deriveAddress(alice.publicKey, 42), // TODO, use correct prefix
        blockHash,
        blockNumber: registry
          .createType('BlockNumber', blockNumber)
          .toNumber(),
        eraPeriod: 64,
        genesisHash,
        metadataRpc,
        nonce: 0, // Assuming this is Alice's first tx on the chain Q: how can we get the right nonce?
        specVersion,
        tip: 0,
        transactionVersion,
      },
      {
        metadataRpc,
        registry,
      }
    )
    return unsigned
  }

  /**
   * Signs an unsigned transaction
   * @param {*} alice 
   * @param {*} unsigned 
   * @param {*} registry 
   * @param {*} metadataRpc 
   * @returns 
   */
  const create_signed_tx = (alice, unsigned, registry, metadataRpc) => {
    // Construct the signing payload from an unsigned transaction.
    const signingPayload = construct.signingPayload(unsigned, { registry });
    console.log(`\nPayload to Sign: ${signingPayload}`);

    // Decode the information from a signing payload.
    const payloadInfo = decode(signingPayload, {
      metadataRpc,
      registry,
    })
    console.log(
      // TODO all the log messages need to be updated to be relevant to the method used
      `\nDecoded Transaction\n  To: ${payloadInfo.method.args.dest}\n` +
      `  Amount: ${payloadInfo.method.args.value}`
    )

    // Sign a payload. This operation should be performed on an offline device.
    const signature = signWith(alice, signingPayload, {
      metadataRpc,
      registry,
    });
    console.log(`\nSignature: ${signature}`);

    // Encode a signed transaction.
    const tx = construct.signedTx(unsigned, signature, {
      metadataRpc,
      registry,
    });
    console.log(`\nTransaction to Submit: ${tx}`);
    return tx;
  }

  const buildBidData = (amount) => {
    let t = new TextEncoder();
    let callData = '';
    // append the select
    callData += blake2AsHex('bid').substring(0, 4)
    // append the args
    callData += t.encode(amount).toString().replaceAll(",", "")
    return callData
  }

  const deployContract = async (name, assetId, assetAmount, deadline, deposit) => {

    // const { web3FromSource } = await import("@polkadot/extension-dapp");
    // const performingAccount = accounts[0];
    // const injector = await web3FromSource(performingAccount.meta.source);

    // let deadline = api.getLatestSlot();
    const contract = new CodePromise(api, contractMetadata, contractWasm);
    console.log("contract is :", contract);

    const tx = contract.tx.new(
      {
        gasLimit: api?.registry.createType('WeightV2', {
          refTime: MAX_CALL_WEIGHT,
          proofSize: PROOFSIZE,
        }),
        storageDepositLimit: null,
      }, 
      name,
      assetId,
      assetAmount,
      deadline,
      deposit,
      );
    let address = "";
    const unsub = await tx.signAndSend(
      alice.address,
      { signer: alice.signer },
      ({ contract, status }) => {
        if (status.isInBlock) {
          // setResult("in a block");
          console.log(contract.address.toString())
        } else if (status.isFinalized) {
          // setResult("finalized");
          address = contract.address.toString();
          // setContractAddress(address);
          unsub();
        }
      }
    );
  };

  const proposeBid = async (e) => {
    e.preventDefault()
    // we do not want to bind the message to the state
    const inputElement = document.getElementById('bid')
    const hasher = new SHA3(256)
    hasher.update(inputElement.value)
    const hash = hasher.digest();
    // the seed shouldn't be reused 
    let timelockedBid = api.encrypt(inputElement.value, 1, slots, "testing234");
    // now we want to call the publish function of the contract
    const value = 1000000000000;
    // call the publish function of the contract
    await contract.tx
      .propose({
        gasLimit: api.api.registry.createType('WeightV2', {
          refTime: MAX_CALL_WEIGHT2,
          proofSize: PROOFSIZE,
        }),
        storageDepositLimit: null,
        value: value,
      },
        timelockedBid.ct.aes_ct.ciphertext,
        timelockedBid.ct.aes_ct.nonce,
        timelockedBid.ct.etf_ct[0],
        Array.from(hash),
      ).signAndSend(alice, result => {
        if (result.status.isInBlock) {
          console.log('in a block');
          console.log(result.toHuman());
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
    const [assetAmount, setAssetAmount] = useState(0);
    const [deposit, setDeposit] = useState(0);

    return (
      <div>
        Create Auction
        <div className='form'>
          <input type="text" placeholder='name' onChange={(e) => setName(e.target.value)} />
          <input type="number" placeholder='deadline' onChange={(e) => setDeadline(e.target.value)} />
          <input type="number" placeholder='assetId' onChange={(e) => setAssetId(e.target.value)} />
          <input type="number" placeholder='assetAmount' onChange={(e) => setAssetAmount(e.target.value)} />
          <div>
            <input type="number" placeholder='deposit' onChange={(e) => setDeposit(e.target.value)} /> ETF
          </div>
          <button onClick={() => deployContract(
            name, assetId, assetAmount, deadline, deposit
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
        { api === null ? '' : api.latestSlot }
        </div>
      </div>
      <div className="body">
        <div>
         <CreateAuctionForm />
          <div>
            <input type='number' placeholder='100' id='bid' /> Unit
          </div>
          <button onClick={proposeBid}>Propose Bid</button>
        </div>
        <button onClick={doComplete}>Complete Auction</button>
      </div>
    </div>
  )
}

export default App
