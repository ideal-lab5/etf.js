import { useContext, useEffect, useState } from 'react';
import './game-screen.component.css';
import { web3FromAddress } from "@polkadot/extension-dapp";
import { CodePromise, ContractPromise } from '@polkadot/api-contract';
import { BN, BN_ONE } from "@polkadot/util";
import { sha256AsU8a, cryptoWaitReady } from '@polkadot/util-crypto';


import abi from '../../resources/contract_data/block_defender.json';
import contractFile from '../../resources/contract_data/block_defender.contract.json';
import { EtfContext } from '../../EtfContext';

function GameScreen() {

  const MAX_CALL_WEIGHT = new BN(1_000_000_000_000).isub(BN_ONE);
  const PROOFSIZE = new BN(1_000_000_000);

  const [address, setAddress] = useState('');
  const [showLoadGame, setShowLoadGame] = useState(false);
  const [gameContract, setGameContract] = useState('');
  const [gameContractAddress, setGameContractAddress] = useState('');
  const [upcomingMineEventSlot, setUpcomingMineEventSlot] = useState(0);

  const [loading, setLoading] = useState(false);

  const [players, setPlayers] = useState([]);
  const [playerBases, setPlayerBases] = useState([]);

  const [gridX, setGridX] = useState(25);
  const [gridY, setGridY] = useState(25);

  const { etf, signer, latestSlot } = useContext(EtfContext);

  // useEffect(() => {

  // }, []);

  async function deployNewGame() {
    setLoading(true);
    const contractWasm = contractFile.source.wasm;
    const contract = new CodePromise(etf.api, abi, contractWasm);
    const storageDepositLimit = null
    console.log("contract is :", contract);
    // mine clock temp code hash: 0x6cca45f120c762ee69d9f20fb11cec032553af29955417013ebeaca5bb3cadd0
    const injector = await web3FromAddress(signer.address);

    // get the current slot and add 20 (10 slots from now)
    let startSlot = parseInt(latestSlot.slot.replaceAll(",", "")) + 10;

    const tx = contract.tx.new({
      gasLimit: etf.api.registry.Type('WeightV2', {
        refTime: MAX_CALL_WEIGHT,
        proofSize: PROOFSIZE,
      }),
      storageDepositLimit,
    }, 25, 25, 10,
      "0x1ea03398ef354fc4d7b91a324831b04d85106c3787dd90d7ac22e40e25485c4b", startSlot);
    let address = "";
    const unsub = await tx.signAndSend(
      signer.address,
      { signer: injector.signer },
      async ({ contract, status }) => {
        if (status.isInBlock) {
          address = contract.address.toString();
          setGameContract(contract);
          await getNextMineSlot(contract);
          localStorage.setItem("gameContractAddress", address);
          setGameContractAddress(address);
          let players = await loadPlayers(contract);
          loadPlayerBases(contract, players);
          setLoading(false);
          unsub();
        }
      }
    );
  };

  async function loadGame() {
    setShowLoadGame(false);
    setLoading(true);
    let contract = await new ContractPromise(etf.api, abi, address);
    await getNextMineSlot(contract);
    localStorage.setItem('gameContractAddress', address);
    setGameContract(contract);
    setGameContractAddress(address);
    let players = await loadPlayers(contract);
    loadPlayerBases(contract, players);
    setLoading(false);
  }

  async function continueGame() {
    setLoading(true);
    let gameContractAddress = localStorage.getItem('gameContractAddress');
    let contract = await new ContractPromise(etf.api, abi, gameContractAddress);
    await getNextMineSlot(contract);
    setGameContract(contract);
    setGameContractAddress(gameContractAddress);
    let players = await loadPlayers(contract);
    loadPlayerBases(contract, players);
    setLoading(false);
  }

  async function getNextMineSlot(contract) {
    await cryptoWaitReady();
    let nextMineSlot = await getNextSlot(contract, "Mine");
    let formatted = parseInt(nextMineSlot.replaceAll(",", ""));
    console.log(formatted)
    setUpcomingMineEventSlot(formatted);
  }

  // initializes the player struct in the contract (if it doesn't exist)
  async function initPlayer(x, y) {
    setLoading(true);
    const injector = await web3FromAddress(signer.address);
    await gameContract.tx
      .initPlayer({
        gasLimit: etf.api.registry.createType('WeightV2', {
          refTime: MAX_CALL_WEIGHT,
          proofSize: PROOFSIZE,
        }),
        storageDepositLimit: null,
      },
        x, y
      ).signAndSend(signer.address, { signer: injector.signer }, async result => {
        // Log the transaction status
        console.log('Transaction status:', result.status.type);
        if (result.status.isInBlock) {
          let players = await loadPlayers(gameContract);
          loadPlayerBases(gameContract, players);
          // await loadPlayerInfo(signer.address);
          setLoading(false);
          console.log(`Transaction included in block hash ${result.status.asInBlock}`);
          // resolve(result);
        }
      });
  }

  async function loadPlayers(contract) {
    const { output } = await contract.query.getPlayers(
      signer.address,
      {
        gasLimit: etf.api.registry.createType('WeightV2', {
          refTime: MAX_CALL_WEIGHT,
          proofSize: PROOFSIZE,
        }),
        storageDepositLimit: null,
      },
    );

    let players = output.toHuman().Ok;
    setPlayers(players);
    return players;
  }

  async function loadPlayerBases(contract) {
    // let con = contract === null ? gameContract : contract
    // console.log(con === null);
    const { output } = await contract.query.getPlayerBase(
      signer.address,
      {
        gasLimit: etf.api.registry.createType('WeightV2', {
          refTime: MAX_CALL_WEIGHT,
          proofSize: PROOFSIZE,
        }),
        storageDepositLimit: null,
      },
    );

    let results = output.toHuman().Ok;
    console.log('bases are  ..... ');
    console.log(results);
    setPlayerBases(results);
  }

  async function getNextSlot(gameContract, action) {
    const { output } = await gameContract.query.getNextSlot(
      signer.address,
      {
        gasLimit: etf.api.registry.createType('WeightV2', {
          refTime: MAX_CALL_WEIGHT,
          proofSize: PROOFSIZE,
        }),
        storageDepositLimit: null,
      }, action
    );
    return output.toHuman().Ok;
  }

  async function execMineClock(b) {
    // prepare a timelocked value and commitment
    // then call the the game contract, which proxies it to the mine event clock

    // timelock encryption
    // for this, we first need to get the correct slot number to encrypt to
    // todo: use sha3 hasher to seed the encrypt call
    let seed = new Date();
    let out = etf.encrypt(b.toString(), 1, [upcomingMineEventSlot], seed);
    // console.log(etf_ct);
    // console.log('capsule');
    // console.log(out.ct.etf_ct[0])

    let commitment = sha256AsU8a(sha256AsU8a(b) + sha256AsU8a(out.ct.key));
    // for now, we will store the msk and nonce in localstorage
    localStorage.setItem(upcomingMineEventSlot, JSON.stringify(
      {
        key: out.ct.key,
        nonce: out.ct.nonce
      }));
    let message = {
      ciphertext: out.ct.aes_ct.ciphertext,
      nonce: out.ct.aes_ct.nonce,
      capsule: out.ct.etf_ct[0],
      commitment: Array.from(commitment),
    };

    console.log(message)
    // then make the contract call
    const injector = await web3FromAddress(signer.address);
    await gameContract.tx
      .play({
        gasLimit: etf.api.registry.createType('WeightV2', {
          refTime: MAX_CALL_WEIGHT,
          proofSize: PROOFSIZE,
        }),
        storageDepositLimit: null,
      }, "Mine", message
      ).signAndSend(signer.address, { signer: injector.signer }, async result => {
        // Log the transaction status
        console.log('Transaction status:', result.status.type);
        if (result.status.isInBlock) {
          console.log(`Transaction included in block hash ${result.status.asInBlock}`);
          let nextRoundInput = await loadNextRoundInput(gameContract, "Mine");
          console.log('verifying inputs exist');
          console.log(nextRoundInput)
          // resolve(result);
        }
      });
  }

  async function loadNextRoundInput(contract, action) {
    const { output } = await contract.query.getNextRoundInput(
      signer.address,
      {
        gasLimit: etf.api.registry.createType('WeightV2', {
          refTime: MAX_CALL_WEIGHT,
          proofSize: PROOFSIZE,
        }),
        storageDepositLimit: null,
      }, action
    );

    return output.toHuman().Ok;
  }

  async function execAdvanceMineClock() {
    // 1. fetch all ciphertexts from the contract storage
    let nextRoundInput = await loadNextRoundInput(gameContract, "Mine");
    // console.log(nextRoundInput);
    // 2. decrypt all ciphertexts and build Vec<(AccountId, u8, [u8;32])>
    let inputs = [];
    nextRoundInput.map(async input => {
      let player = input[0];
      // let msg = input[1];
      
      let msg = etf.createType('TlockMessage', input[1]);
      console.log(msg);
      // let sks = await etf.secrets(Array.from([parseInt(upcomingMineEventSlot)]))
      // console.log(sks);
      // console.log([upcomingMineEventSlot])
      // let decoder = new TextDecoder();
      // let decoded = JSON.parse()
      // let d = hexToU8a(msg.ciphertext);
      // console.log(d);

      let b = await etf.decrypt(
        msg.ciphertext,
        msg.nonce,
        [msg.capsule], // expects Vec<Vec<u8>>
        [upcomingMineEventSlot],
      );
      let bit = String.fromCharCode(...b);
      inputs.push({
        address: player, 
        data: bit, 
        msk: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      });
    });

    console.log(inputs);

    const injector = await web3FromAddress(signer.address);
    await gameContract.tx
        .advanceClock({
          gasLimit: etf.api.registry.createType('WeightV2', {
            refTime: MAX_CALL_WEIGHT,
            proofSize: PROOFSIZE,
          }),
          storageDepositLimit: null,
        }, "Mine", inputs
        ).signAndSend(signer.address, { signer: injector.signer }, async result => {
          // Log the transaction status
          console.log('Transaction status:', result.status.type);
          if (result.status.isInBlock) {
            // setUpcomingMineEventSlot(upcomingMineEventSlot);
            // let players = await loadPlayers(gameContract);
            // loadPlayerBases(gameContract, players);
            // await loadPlayerInfo(signer.address);
            console.log(`Transaction included in block hash ${result.status.asInBlock}`);
            // resolve(result);
          }
        });

  }

  const mapCoordinatesToIndex = (x, y) => x + y * 25;

  return (
    <div className="game-screen">

    {loading === true ? 
      <div>
          Loading...
      </div> :
    <div className='game-details-container'>
      {gameContract === '' ?
        <div className='load-game-container'>
          {showLoadGame === true ?
            <div>
              <input type="text" placeholder='5ghAd8...'
                value={address} onChange={(e) => setAddress(e.target.value)} />
              <button className='start-btn menu-btn' onClick={loadGame}>
                submit
              </button>
              <button className='start-btn menu-btn' onClick={() => setShowLoadGame(false)}>
                back
              </button>
            </div> :
            <div>
              <button className='start-btn menu-btn' onClick={deployNewGame}>
                New Game
              </button>
              <button className='start-btn menu-btn' onClick={() => setShowLoadGame(true)}>
                Search Games
              </button>
              <button className='start-btn menu-btn' onClick={continueGame}>
                Continue Game
              </button>
            </div>
          }

        </div> :
        <div>
          <div>
            <div className='stats-container flex-child'>
              <span>Game Address: {gameContractAddress}</span>
              {players.indexOf(signer.address) < 0 ?
                <button className='start-btn btn' onClick={() => initPlayer(
                  Math.floor(Math.random() * 25),
                  Math.floor(Math.random() * 25))
                }>
                  Create Base
                </button>
                : <div></div>}
              {upcomingMineEventSlot > 0 && latestSlot && parseInt(latestSlot.slot.replaceAll(",", "")) > upcomingMineEventSlot ?
                <button className='start-btn btn' onClick={() => execAdvanceMineClock()}>
                  Advance Clock
                </button> :
                <button className='start-btn btn' onClick={() => execMineClock(
                  (Math.round(Math.random() * 100)) % 2)
                }>
                  Mine (Iron) {!latestSlot ? '' : parseInt(latestSlot.slot.replaceAll(",", "")) - upcomingMineEventSlot}
                </button>
              }
            </div>
            <div className='game-container flex-child'>
              <div className="game-board">
                  {[...Array(25 * 25).keys()].map((key) => {
                    const x = key % 25;
                    const y = Math.floor(key / 25);
                    const isPlayerBase = playerBases.some(
                      (base) => base[1].x === x.toString() && base[1].y === y.toString()
                    );
                    // based on player addr, could determine a color
                    return (
                      <div
                        key={key}
                        className={`box ${isPlayerBase ? 'player-base' : ''}`}
                      ></div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      }
      {players.length === 0 ? <div></div> :
        <div className='players-container'>
          <span>Players</span>
          <table>
            <tbody>
              {players.map((addr, key) => {
                return (
                  <tr key={key}>
                    <td>
                      <span>
                        {addr}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      }
      </div>
    }
    </div>
  );

}

export default GameScreen;