import { useContext, useState } from 'react';
import './game-screen.component.css'; 
import { web3FromAddress } from "@polkadot/extension-dapp";
import { CodePromise, ContractPromise } from '@polkadot/api-contract';
import { BN, BN_ONE } from "@polkadot/util";


import abi from '../../resources/contract_data/block_defender.json';
import contractFile from '../../resources/contract_data/block_defender.contract.json';
import { EtfContext } from '../../EtfContext';

function GameScreen() {

    const MAX_CALL_WEIGHT = new BN(1_000_000_000_000).isub(BN_ONE);
    const PROOFSIZE = new BN(1_000_000_000);

    const [address, setAddress] = useState('');
    const [showLoadGame, setShowLoadGame] = useState(false);
    const [gameContract, setGameContract] = useState('');
    const [playerBase, setPlayerBase] = useState(null);

    const [gridX, setGridX] = useState(25);
    const [gridY, setGridY] = useState(25);

    const { etf, signer, latestSlot } = useContext(EtfContext);
    
    async function deployNewGame() {
        const contractWasm = contractFile.source.wasm;
        const contract = new CodePromise(etf.api, abi, contractWasm);
        const storageDepositLimit = null
        console.log("contract is :", contract);
        // mine clock temp code hash: 0x6cca45f120c762ee69d9f20fb11cec032553af29955417013ebeaca5bb3cadd0
        const injector = await web3FromAddress(signer.address);

        // get the current slot and add 20 (10 slots from now)
        let startSlot = parseInt(latestSlot.slot.replaceAll(",", "")) + 20;

        const tx = contract.tx.new({
            gasLimit: etf.api.registry.createType('WeightV2', {
                refTime: MAX_CALL_WEIGHT,
                proofSize: PROOFSIZE,
              }),
              storageDepositLimit,
        }, 25, 25, 100, 
        "0x6cca45f120c762ee69d9f20fb11cec032553af29955417013ebeaca5bb3cadd0", startSlot);
        let address = "";
        const unsub = await tx.signAndSend(
          signer.address,
          { signer: injector.signer },
          ({ contract, status }) => {
            if (status.isInBlock) {
            //   setResult("in a block");
            } else if (status.isFinalized) {
            //   setResult("finalized");
              address = contract.address.toString();
              setGameContract(contract);
              updatePlayerInfo(signer.address);
              unsub();
            }
          }
        );
      };

    async function loadGame() {
        setShowLoadGame(false);
        let contract = new ContractPromise(etf.api, abi, address)
        setGameContract(contract);
        console.log('kladsflkjhadsf');
        console.log(signer.address)
        updatePlayerInfo(contract, signer.address);
    }

    // initializes the player struct in the contract (if it doesn't exist)
    async function initPlayer(x, y) {
        // await gameContract.tx.initPlayer(x, y);
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
                await updatePlayerInfo(gameContract, signer.address);
                console.log(`Transaction included in block hash ${result.status.asInBlock}`);
                // resolve(result);
              }
            });

    }

    async function updatePlayerInfo(contract, who) {
        console.log('looking for info for ' + who);
        const { output } = await contract.query.getPlayerBase(
            signer.address,
            {
              gasLimit: etf.api.registry.createType('WeightV2', {
                refTime: MAX_CALL_WEIGHT,
                proofSize: PROOFSIZE,
              }),
              storageDepositLimit: null,
            }, who
          );

        let base = etf.createType('PlayerBase', output);
        console.log('raw output')
        console.log(output)
        console.log(base.toHuman());
        if (base['defensePoints'].toHuman() > 0) {
            setPlayerBase(base);
        }
    }

    return(
        <div className="game-screen">
            { gameContract === '' ?
            <div className='load-game-container'>
                
                { showLoadGame === true ? 
                <div>
                    <input type="text" placeholder='5ghAd8...' 
                        value={address} onChange={(e) => setAddress(e.target.value)}/>
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
                        Load Game
                    </button>
                </div>
                }
                
            </div> :
            <div>
                <span>
                    {/* Current Game contract: {  } */}
                </span>
                <div className='stats-container flex-child'>
                    { playerBase === null ?
                    <button className='start-btn btn' onClick={() => initPlayer(1, 2)}>
                        Create Base
                    </button>
                    : <div></div>}
                    <button className='start-btn btn'>
                        Mine Cell
                    </button>
                </div>
                <div className='game-container flex-child'>
                    <div className="game-board">
                    {/* <div style={gameBoardStyle(25, 25)}> */}
                        { [...Array(25 * 25).keys()].map(key => {
                            return <div key={key} className='box'></div>;
                        }) }
                    </div>
                </div>
            </div>
            }
        </div>
    );

}

export default GameScreen;