import { ApiPromise, WsProvider } from "@polkadot/api";
import { Metadata, TypeRegistry } from "@polkadot/types";
import init, { EtfApiWrapper } from "etf-sdk";

/**
 * Encryption to the Future
 * This class initializes the ETF.js SDK
 */
class Etf {

    constructor(host, port) {
        this.host = host;
        this.port = port;
    }

    // connect to the chain and init wasm
    async init() {
        let provider = new WsProvider(`ws://${this.host}:${this.port}`);;
        // setup api for blockchain
        const api = await ApiPromise.create({
            provider,
            rpc: {
                etf: {
                    slotIdentity: {
                        description: "Calculate the public key for a given string",
                        params: [{ id: 'Bytes', }]
                    }
                }
            },
        });
        await api.isReady;
        this.api = api;
        // load metadata and predigest
        let data = await api.rpc.state.getMetadata();
        const registry = new TypeRegistry();
        registry.register({
            PreDigest: {
                slot: 'u64',
                secret: '[u8;48]',
                proof: '([u8;48], [u8;48], [u8;32], [u8;48])'
            }
        });
        const metadata = new Metadata(registry, data.toHex());
        registry.setMetadata(metadata);
        this.registry = registry;
        this.listenForSecrets();

        // we want to load the ibe public params here
        let pps = await api.query.etf.ibeParams();

        init().then(_ => {
            console.log('wasm initialized successfully');
            let etfApi = new EtfApiWrapper(pps[1], pps[2]);
            console.log('etf api initialized');
            let version = String.fromCharCode(...etfApi.version());
            console.log('version ' + version);
            this.etfApi = etfApi;
            this.encrypt = this.etfApi.encrypt.bind(this.etfApi);
            this.decrypt = this.etfApi.decrypt.bind(this.etfApi);
        });
    }

    // listen for incoming block headers and emit an event 
    // when new headers are encountered
    // currently stores no history
    async listenForSecrets() {
        this.api.derive.chain.subscribeNewHeads(async (header) => {
            // read the predigest from each block
            let encodedPreDigest = header.digest.logs[0].toHuman().PreRuntime[1];
            const predigest = this.registry.createType('PreDigest', encodedPreDigest);
            const event = new CustomEvent('blockHeader', { detail: predigest.toHuman() });
            document.dispatchEvent(event);
        });
    }

    // not really needed until we add contracts
    // loadAccount() {
    //     // load ALICE account
    //     // const keyring = new Keyring({ type: 'sr25519' });
    //     // let uriAcct = keyring.addFromUri("//Alice");
    //     // this.acct = uriAcct;
    // }
}

export default Etf;