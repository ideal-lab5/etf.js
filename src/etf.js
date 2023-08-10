"use strict";
// import { ApiPromise, WsProvider } from "@polkadot/api";
// import { Metadata, TypeRegistry } from "@polkadot/types";
// import init, { EtfApiWrapper } from "etf-sdk";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Etf = void 0;
// /**
//  * Encryption to the Future
//  * This class initializes the ETF.js SDK
//  */
// class Etf {
//     constructor(host, port) {
//         this.host = host;
//         this.port = port;
//     }
//     // connect to the chain and init wasm
//     async init() {
//         let provider = new WsProvider(`ws://${this.host}:${this.port}`);;
//         // setup api for blockchain
//         const api = await ApiPromise.create({
//             provider,
//             rpc: {
//                 etf: {
//                     slotIdentity: {
//                         description: "Calculate the public key for a given string",
//                         params: [{ id: 'Bytes', }]
//                     }
//                 }
//             },
//         });
//         await api.isReady;
//         this.api = api;
//         // load metadata and predigest
//         let data = await api.rpc.state.getMetadata();
//         const registry = new TypeRegistry();
//         registry.register({
//             PreDigest: {
//                 slot: 'u64',
//                 secret: '[u8;48]',
//                 proof: '([u8;48], [u8;48], [u8;32], [u8;48])'
//             }
//         });
//         const metadata = new Metadata(registry, data.toHex());
//         registry.setMetadata(metadata);
//         this.registry = registry;
//         this.listenForSecrets();
//         // we want to load the ibe public params here
//         let pps = await api.query.etf.ibeParams();
//         init().then(_ => {
//             console.log('wasm initialized successfully');
//             let etfApi = new EtfApiWrapper(pps[1], pps[2]);
//             console.log('etf api initialized');
//             let version = String.fromCharCode(...etfApi.version());
//             console.log('version ' + version);
//             this.etfApi = etfApi;
//             this.encrypt = this.etfApi.encrypt.bind(this.etfApi);
//             this.decrypt = this.etfApi.decrypt.bind(this.etfApi);
//         });
//     }
//     // listen for incoming block headers and emit an event 
//     // when new headers are encountered
//     // currently stores no history
//     async listenForSecrets() {
//         this.api.derive.chain.subscribeNewHeads(async (header) => {
//             // read the predigest from each block
//             let encodedPreDigest = header.digest.logs[0].toHuman().PreRuntime[1];
//             const predigest = this.registry.createType('PreDigest', encodedPreDigest);
//             const event = new CustomEvent('blockHeader', { detail: predigest.toHuman() });
//             document.dispatchEvent(event);
//         });
//     }
//     // not really needed until we add contracts
//     // loadAccount() {
//     //     // load ALICE account
//     //     // const keyring = new Keyring({ type: 'sr25519' });
//     //     // let uriAcct = keyring.addFromUri("//Alice");
//     //     // this.acct = uriAcct;
//     // }
// }
// export default Etf;
var api_1 = require("@polkadot/api");
var types_1 = require("@polkadot/types");
var etf_sdk_1 = require("etf-sdk");
/**
 * Encryption to the Future
 * This class initializes the ETF.js SDK
 */
var Etf = /** @class */ (function () {
    function Etf(host, port) {
        this.host = host;
        this.port = port;
    }
    // connect to the chain and init wasm
    Etf.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var provider, _a, data, metadata, pps, version;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        provider = new api_1.WsProvider("ws://".concat(this.host, ":").concat(this.port));
                        // setup api for blockchain
                        _a = this;
                        return [4 /*yield*/, api_1.ApiPromise.create({
                                provider: provider,
                                rpc: {
                                    etf: {
                                        slotIdentity: {
                                            description: "Calculate the public key for a given string",
                                            params: [{ id: 'Bytes', }]
                                        }
                                    }
                                },
                            })];
                    case 1:
                        // setup api for blockchain
                        _a.api = _b.sent();
                        return [4 /*yield*/, this.api.isReady];
                    case 2:
                        _b.sent();
                        this.registry = new types_1.TypeRegistry();
                        return [4 /*yield*/, this.api.rpc.state.getMetadata()];
                    case 3:
                        data = _b.sent();
                        this.registry.register({
                            PreDigest: {
                                slot: 'u64',
                                secret: '[u8;48]',
                                proof: '([u8;48], [u8;48], [u8;32], [u8;48])'
                            }
                        });
                        metadata = new types_1.Metadata(this.registry, data.toHex());
                        this.registry.setMetadata(metadata);
                        this.listenForSecrets();
                        return [4 /*yield*/, this.api.query.etf.ibeParams()];
                    case 4:
                        pps = _b.sent();
                        return [4 /*yield*/, (0, etf_sdk_1.default)()];
                    case 5:
                        _b.sent();
                        console.log('wasm initialized successfully');
                        this.etfApi = new etf_sdk_1.EtfApiWrapper(pps[1], pps[2]);
                        console.log('etf api initialized');
                        version = String.fromCharCode.apply(String, this.etfApi.version());
                        console.log('version ' + version);
                        this.encrypt = this.etfApi.encrypt.bind(this.etfApi);
                        this.decrypt = this.etfApi.decrypt.bind(this.etfApi);
                        return [2 /*return*/];
                }
            });
        });
    };
    // listen for incoming block headers and emit an event 
    // when new headers are encountered
    // currently stores no history
    Etf.prototype.listenForSecrets = function () {
        var _this = this;
        this.api.derive.chain.subscribeNewHeads(function (header) { return __awaiter(_this, void 0, void 0, function () {
            var encodedPreDigest, predigest, event_1;
            return __generator(this, function (_a) {
                // read the predigest from each block
                if (!header === null && !header === undefined) {
                    encodedPreDigest = header.digest.logs[0].toHuman().PreRuntime[1];
                    predigest = this.registry.createType('PreDigest', encodedPreDigest);
                    event_1 = new CustomEvent('blockHeader', { detail: predigest.toHuman() });
                    document.dispatchEvent(event_1);
                }
                return [2 /*return*/];
            });
        }); });
    };
    return Etf;
}());
exports.Etf = Etf;
// module.exports = Etf;
exports.default = Etf;
//# sourceMappingURL=etf.js.map