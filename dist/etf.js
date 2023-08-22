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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Etf = exports.DistanceBasedSlotScheduler = exports.TimeInput = void 0;
const api_1 = require("@polkadot/api");
const types_1 = require("@polkadot/types");
const util_1 = require("@polkadot/util");
const rpc_provider_1 = require("@polkadot/rpc-provider");
const Sc = __importStar(require("@substrate/connect"));
const etf_sdk_1 = __importStar(require("etf-sdk"));
const etfTestSpecRaw_json_1 = __importDefault(require("./etfTestSpecRaw.json"));
// import { chain } from "@polkadot/types/interfaces/definitions";
/**
 * The slot schedule holds a list of slot ids which are intended to be used in etf
 */
class SlotSchedule {
    constructor(slotIds) {
        this.slotIds = slotIds;
    }
}
class TimeInput {
    constructor(distance) {
        this.distance = distance;
    }
}
exports.TimeInput = TimeInput;
/**
 * Select slots randomly between the latest known slot and a future slot
 */
class DistanceBasedSlotScheduler {
    generateSchedule(n, currentSlot, input) {
        // const currentSlot = Math.floor(input.currentSlot + 1);
        const distance = Math.floor(input.distance);
        if (n > distance) {
            throw new Error("number of slots must be less than total slots");
        }
        let terminalSlot = (currentSlot + 1) + distance * 2;
        const slotIds = [];
        // Generate n random slot IDs between currentSlot+1 and terminalSlot
        // ensuring multiples of 2
        for (let i = 0; i < n; i++) {
            const range = Math.floor((terminalSlot - currentSlot + 1) / 2);
            const randomSlot = currentSlot + Math.floor(Math.random() * range) * 2;
            slotIds.push(randomSlot);
        }
        slotIds.sort();
        return new SlotSchedule(slotIds);
    }
}
exports.DistanceBasedSlotScheduler = DistanceBasedSlotScheduler;
/**
 * Encryption to the Future
 * This class initializes the ETF.js SDK
 * It assumes a time-based SlotScheduler
 */
class Etf {
    constructor(host, port, slotScheduler) {
        this.host = host;
        this.port = port;
        this.slotScheduler = slotScheduler;
    }
    // connect to the chain and init wasm
    init(doUseLightClient) {
        return __awaiter(this, void 0, void 0, function* () {
            let provider;
            if (doUseLightClient) {
                let spec = JSON.stringify(etfTestSpecRaw_json_1.default);
                provider = new rpc_provider_1.ScProvider(Sc, spec);
                // let provider = new ScProvider(Sc, Sc.WellKnownChain.polkadot);
                yield provider.connect();
                console.log('provider connected');
                const api = yield api_1.ApiPromise.create({ provider });
                yield api.isReady;
                this.api = api;
            }
            else {
                provider = new api_1.WsProvider(`ws://${this.host}:${this.port}`);
                this.api = yield api_1.ApiPromise.create({ provider });
                yield this.api.isReady;
            }
            // console.log('moving on...');
            // setup api for blockchain
            console.log('api is ready');
            yield this.api.rpc.chain.subscribeNewHeads((lastHeader) => {
                console.log(lastHeader.number.toString());
            });
            this.registry = new types_1.TypeRegistry();
            // load metadata and predigest
            const data = yield this.api.rpc.state.getMetadata();
            // console.log(data);
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
        });
    }
    /**
     * Encrypt a message
     * @param message The message to encrypt
     * @param n The number of slots to encrypt for
     * @param schedulerInput The schedulerInput for the slot scheduler
     * @returns the ciphertext and slot schedule
     */
    encrypt(message, n, threshold, schedulerInput) {
        let slotSchedule = this.slotScheduler.generateSchedule(n, this.getLatestSlot(), schedulerInput);
        let t = new TextEncoder();
        let ids = [];
        for (const id of slotSchedule.slotIds) {
            ids.push(t.encode(id.toString()));
        }
        return {
            ct: this.etfApi.encrypt(message, ids, threshold),
            slotSchedule: slotSchedule
        };
    }
    /**
     *
     * @param ct
     * @param nonce
     * @param capsule
     * @param slotSchedule
     * @returns
     */
    decrypt(ct, nonce, capsule, slotSchedule) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('hi');
            // testing only
            yield this.api.rpc.chain.subscribeNewHeads((header) => __awaiter(this, void 0, void 0, function* () {
                console.log(`Chain is at block: #${header.number}`);
                const blockHash = yield this.api.rpc.chain.getBlockHash(header.number);
                console.log(`blockHash: ${blockHash}`);
                const at = yield this.api.at(blockHash);
                const events = yield at.query.system.events();
                console.log(events.toHuman());
            }));
            console.log('bye');
            let sks = [];
            let latest = this.getLatestSlot();
            let slotIds = slotSchedule.slotIds;
            for (const slotId of slotIds) {
                let distance = (latest - slotId) / 2;
                let blockNumber = this.latestBlockNumber.toNumber() - distance;
                console.log('the block number is ' + blockNumber);
                let blockHash = yield this.api.rpc.chain.getBlockHash(blockNumber);
                console.log('the blockhash is ' + blockHash);
                let blockHeader = yield this.api.rpc.chain.getHeader(blockHash);
                let encodedPreDigest = blockHeader.digest.logs[0].toHuman().PreRuntime[1];
                const predigest = this.registry.createType('PreDigest', encodedPreDigest);
                let sk = (0, util_1.hexToU8a)(predigest.secret.toString());
                sks.push(sk);
            }
            return this.etfApi.decrypt(ct, nonce, capsule, sks);
        });
    }
    // listen for incoming block headers and emit an event 
    // when new headers are encountered
    // currently stores no history
    listenForSecrets() {
        this.api.rpc.chain.subscribeNewHeads((header) => {
            // read the predigest from each block
            const encodedPreDigest = header.digest.logs[0].toHuman().PreRuntime[1];
            const predigest = this.registry.createType('PreDigest', encodedPreDigest);
            let latest = predigest.toHuman();
            this.latestSlot = latest;
            this.latestBlockNumber = header["number"];
            const event = new CustomEvent('blockHeader', { detail: latest });
            document.dispatchEvent(event);
        });
    }
    getLatestSlot() {
        return Number.parseInt(this.latestSlot.slot.replaceAll(",", ""));
    }
}
exports.Etf = Etf;
