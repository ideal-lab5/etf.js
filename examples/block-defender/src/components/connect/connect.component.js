/* global BigInt */
import { web3Enable, web3Accounts, web3FromAddress } from "@polkadot/extension-dapp";
import { useContext, useEffect, useState } from 'react';
import { EtfContext } from "../../EtfContext";
import Modal from "../common/modal";

import './connect.component.css';

function WalletConnect(props) {

    const [isConnected, setIsConnected] = useState(false);
    const [showWalletSelection, setShowWalletSelection] = useState(true)
    const [signerAddress, setSignerAddress] = useState("");
    const [availableAccounts, setAvailableAccounts] = useState([]);
    const [balance, setBalance] = useState(0);

    const { etf, signer } = useContext(EtfContext);

    useEffect(() => {
        handleConnect()
    }, []);

    async function connect() {
        await web3Enable('BlockDefender');
        const allAccounts = await web3Accounts();
        setAvailableAccounts(allAccounts);
    }

    // Handler for the click event of the `Connect` button on the NavBar.
    const handleConnect = async () => {
        await connect();
    }

    const checkBalance = async () => {
        let bal  = await etf.api.query.balances.account(signerAddress);
        console.log(bal.toHuman());
        let bigBalance = BigInt(parseInt(bal.free))
        setBalance(Number(bigBalance) || 0);
    }

    const handleSelectWallet = (address) => async () => {
        // finds an injector for an address
        const injector = await web3FromAddress(address);
        props.setSigner({ signer: injector.signer, address });
        setSignerAddress(address);
        setIsConnected(true);
        setShowWalletSelection(false);
        checkBalance()
    }

    return (
        <div className="connect">
            {isConnected ?
                <div className="wallet-m">
                    Balance: {balance} ETF
                </div> :
                <div className="connect-modal-container">
                    <Modal
                        title="Select an account"
                        visible={showWalletSelection}
                        onClose={() => setShowWalletSelection(false)}
                    >
                    {availableAccounts.length > 0 ?
                        <table className="account-selection-table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Address</th>
                                    <th scope="col"/>
                                </tr>
                            </thead>
                            <tbody>
                                {availableAccounts.map((account, index) => (
                                    <tr key={index}>
                                        <td>
                                            {account.meta.name}
                                        </td>
                                        <td>
                                            {account.address.substring(0, 8) + '...'}
                                        </td>
                                        <td>
                                            <button onClick={handleSelectWallet(account.address)}>
                                                Connect
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table> :
                        <div>
                            <h3>You need a polkadotjs wallet and at least one account to play.</h3>
                        </div>
                    }</Modal>
                    </div>
            }</div>
    );
}

export default WalletConnect;