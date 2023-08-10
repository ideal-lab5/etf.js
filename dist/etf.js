"use strict";
// /**
//  * Encryption to the Future
//  * This class initializes the ETF.js SDK
//  */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Etf = void 0;
const api_1 = require("@polkadot/api");
const types_1 = require("@polkadot/types");
const etf_sdk_1 = __importStar(require("etf-sdk"));
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
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = new api_1.WsProvider(`ws://${this.host}:${this.port}`);
            // setup api for blockchain
            this.api = yield api_1.ApiPromise.create({
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
            yield this.api.isReady;
            this.registry = new types_1.TypeRegistry();
            // load metadata and predigest
            const data = yield this.api.rpc.state.getMetadata();
            this.registry.register({
                PreDigest: {
                    slot: 'u64',
                    secret: '[u8;48]',
                    proof: '([u8;48], [u8;48], [u8;32], [u8;48])'
                }
            });
            const metadata = new types_1.Metadata(this.registry, data.toHex());
            this.registry.setMetadata(metadata);
            this.listenForSecrets();
            // we want to load the ibe public params here
            const pps = yield this.api.query.etf.ibeParams();
            yield (0, etf_sdk_1.default)();
            console.log('wasm initialized successfully');
            this.etfApi = new etf_sdk_1.EtfApiWrapper(pps[1], pps[2]);
            console.log('etf api initialized');
            const version = String.fromCharCode(...this.etfApi.version());
            console.log('version ' + version);
            this.encrypt = this.etfApi.encrypt.bind(this.etfApi);
            this.decrypt = this.etfApi.decrypt.bind(this.etfApi);
        });
    }
    // listen for incoming block headers and emit an event 
    // when new headers are encountered
    // currently stores no history
    listenForSecrets() {
        this.api.derive.chain.subscribeNewHeads((header) => __awaiter(this, void 0, void 0, function* () {
            // read the predigest from each block
            const encodedPreDigest = header.digest.logs[0].toHuman().PreRuntime[1];
            const predigest = this.registry.createType('PreDigest', encodedPreDigest);
            const event = new CustomEvent('blockHeader', { detail: predigest.toHuman() });
            document.dispatchEvent(event);
        }));
    }
}
exports.Etf = Etf;
// export default Etf;
