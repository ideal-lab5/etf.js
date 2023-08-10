// /**
//  * Encryption to the Future
//  * This class initializes the ETF.js SDK
//  */

import { ApiPromise, WsProvider } from "@polkadot/api";
import { Metadata, TypeRegistry } from "@polkadot/types";
import init, { EtfApiWrapper } from "etf-sdk";

/**
 * Encryption to the Future
 * This class initializes the ETF.js SDK
 */
export class Etf {
    private host: string;
    private port: number;
    private api!: ApiPromise;
    private registry!: TypeRegistry;
    private etfApi!: EtfApiWrapper;
    public encrypt!: typeof EtfApiWrapper.prototype.encrypt;
    public decrypt!: typeof EtfApiWrapper.prototype.decrypt;

    constructor(host: string, port: number) {
        this.host = host;
        this.port = port;
    }

    // connect to the chain and init wasm
    async init(): Promise<void> {
        const provider = new WsProvider(`ws://${this.host}:${this.port}`);
        
        // setup api for blockchain
        this.api = await ApiPromise.create({
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

        await this.api.isReady;
        this.registry = new TypeRegistry();

        // load metadata and predigest
        const data = await this.api.rpc.state.getMetadata();
        this.registry.register({
            PreDigest: {
                slot: 'u64',
                secret: '[u8;48]',
                proof: '([u8;48], [u8;48], [u8;32], [u8;48])'
            }
        });

        const metadata = new Metadata(this.registry, data.toHex());
        this.registry.setMetadata(metadata);
        this.listenForSecrets();

        // we want to load the ibe public params here
        const pps = await this.api.query.etf.ibeParams();

        await init();
        console.log('wasm initialized successfully');

        this.etfApi = new EtfApiWrapper(pps[1], pps[2]);
        console.log('etf api initialized');

        const version = String.fromCharCode(...this.etfApi.version());
        console.log('version ' + version);

        this.encrypt = this.etfApi.encrypt.bind(this.etfApi);
        this.decrypt = this.etfApi.decrypt.bind(this.etfApi);
    }

    // listen for incoming block headers and emit an event 
    // when new headers are encountered
    // currently stores no history
    private listenForSecrets(): void {
        this.api.derive.chain.subscribeNewHeads(async (header) => {
            // read the predigest from each block
            const encodedPreDigest = header.digest.logs[0].toHuman().PreRuntime[1];
            const predigest = this.registry.createType('PreDigest', encodedPreDigest);

            const event = new CustomEvent('blockHeader', { detail: predigest.toHuman() });
            document.dispatchEvent(event);
        });
    }
}

// export default Etf;