import React, { useContext, useEffect, useState } from 'react';
import { EtfContext } from '../../EtfContext';
import './transmutation.css';

import { complete, getAssetSwapHash, getPendingSwap, queryAssetOwner, queryClaimedAssets, rejectSwap, transmute__call, tryNewSwap } from '../../services/transmutation.service';
import { Link, useNavigate } from 'react-router-dom';
import { hexToString, hexToU8a } from '@polkadot/util';

function Transmutation() {

    const { etf, signer, contract, latestSlot, latestBlock } = useContext(EtfContext);

    const [activeSwap, setActiveSwap] = useState('');
    const [swap, setSwap] = useState('');

    const [to, setTo] = useState('');
    const [deadline, setDeadline] = useState(0);

    useEffect(() => {
        const setup = async () => {
            let swap = await getPendingSwap(etf, signer, contract);
            setSwap(swap.Ok);
            console.log(swap.Ok)
            if (swap.Ok) {
                let activeSwap = await handleQueryActiveSwapHash(swap.Ok);
                setActiveSwap(activeSwap);
            }
        }
        setup();
    }, []);

    const handleTransmute = async () => {
        // submit a delayed transaction to call transmute at the swap deadline
        let innerCall = transmute__call(etf, contract);
        let deadlineBlock = parseInt(swap['deadline'].replaceAll(",", ""));
        // console.log(deadline)
        let diff = deadlineBlock - etf.latestBlockNumber;
        let slot = etf.getLatestSlot() + diff;
        let outerCall = etf.delay(innerCall, 99, slot).call;
        console.log(outerCall)
        await outerCall.signAndSend(signer.address, result => {
            if (result.status.isInBlock) {
                console.log('transmutation scheduled')
                localStorage.setItem("transmutationStatus", "submitted");
            }
        });
    }

    const handleQueryActiveSwapHash = async (swap) => {
        let hash = await getAssetSwapHash(etf, signer, contract, swap['assetIdOne']);
        return hash.Ok;
    }

    const handleReject = async () => {
        await rejectSwap(etf, signer, contract, result => {
            if (result.status.isInBlock) {
                console.log('swap rejected');
            }
        });
    }

    const handleCreateSwap = async () => {
        await tryNewSwap(etf, signer, contract, to, etf.latestBlockNumber + 100, result => {
            console.log('it worked!');
        });
    }

    const handleCompleteSwap = async () => {
        await complete(etf, signer, contract, activeSwap, result => {
            if (result.status.isInBlock) {
                console.log('it worked! swap completed')
            }
        });
    }

    return (
        <div className='transmutation-component'>
            Transmute Assets
            <div className='transmutation-body'>
                <span>Current Block: {latestBlock}</span>
                {(activeSwap === null || activeSwap === '') && (swap === '' || swap === null) ?
                    <div className='pending-swap-container'>
                        <span>Create a new swap</span>
                        <label htmlFor='acct-id-input'>AccountId</label>
                        <input type="text" id="acct-id-input" value={to} onChange={e => setTo(e.target.value)} />
                        <label htmlFor='deadline-input' onChange={e => setDeadline(e.target.value)}>Deadline (block)</label>
                        <input type="number" id="deadline-input" />
                         <button className="open-button" onClick={handleCreateSwap}>
                            Create Swap
                        </button>
                    </div> :
                    <div>
                        {activeSwap !== null && activeSwap !== '0x00000' ?
                            <div className='pending-swap-container'>
                                <span>Swap Id: {activeSwap}</span>
                                <button className="open-button" onClick={handleCompleteSwap}>Complete</button>
                            </div> :
                            <div className='pending-swap-container'>
                                <span>Pending Swap</span>
                                <span>Asset One: {swap['assetIdOne']} </span>
                                <span>Asset Two: {swap['assetIdTwo']} </span>
                                <span>Deadline: {swap['deadline']} </span>
                                {parseInt(swap['deadline'].replaceAll(",", "")) < etf.latestBlockNumber ?
                                    <div>
                                        <button className="open-button" onClick={handleReject}>Reject Swap (expired)</button>
                                    </div> :
                                    <div>
                                        <button className="open-button" onClick={handleTransmute}>Transmute</button>
                                    </div>}

                            </div>
                        }
                    </div>
                }
            </div>
        </div>
    );
};

export default Transmutation;
