var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// /**
//  * Encryption to the Future
//  * This class initializes the ETF.js SDK
//  */
// see: https://polkadot.js.org/docs/api/FAQ/#since-upgrading-to-the-7x-series-typescript-augmentation-is-missing
import "@polkadot/api-augment";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { Metadata, TypeRegistry } from "@polkadot/types";
import { hexToU8a } from "@polkadot/util";
import { ScProvider } from "@polkadot/rpc-provider";
import * as Sc from "@ideallabs/connect";
import init, { EtfApiWrapper } from "etf-sdk";
import chainSpec from './etfTestSpecRaw.json';
/**
 * The slot schedule holds a list of slot ids which are intended to be used in etf
 */
class SlotSchedule {
    constructor(slotIds) {
        this.slotIds = slotIds;
    }
}
export class TimeInput {
    constructor(distance) {
        this.distance = distance;
    }
}
/**
 * Select slots randomly between the latest known slot and a future slot
 */
export class DistanceBasedSlotScheduler {
    // TODO: ensure no collision
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
/**
 * Encryption to the Future
 * This class initializes the ETF.js SDK
 * It assumes a time-based SlotScheduler
 */
export class Etf {
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
                let spec = JSON.stringify(chainSpec);
                provider = new ScProvider(Sc, spec);
                yield provider.connect();
                console.log('provider connected');
            }
            else {
                provider = new WsProvider(`ws://${this.host}:${this.port}`);
            }
            this.api = yield ApiPromise.create({ provider });
            yield this.api.isReady;
            console.log('api is ready');
            this.registry = new TypeRegistry();
            // load metadata and predigest
            const data = yield this.api.rpc.state.getMetadata();
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
            yield init();
            console.log('wasm initialized successfully');
            const pps = yield this.api.query.etf.ibeParams();
            this.etfApi = new EtfApiWrapper(pps[1], pps[2]);
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
     * Decrypt the ciphertext
     * @param ct
     * @param nonce
     * @param capsule
     * @param slotSchedule
     * @returns
     */
    decrypt(ct, nonce, capsule, slotSchedule) {
        return __awaiter(this, void 0, void 0, function* () {
            let sks = [];
            let latest = this.getLatestSlot();
            let slotIds = slotSchedule.slotIds;
            for (const slotId of slotIds) {
                let distance = (latest - slotId) / 2;
                let blockNumber = this.latestBlockNumber.toNumber() - distance;
                let blockHash = yield this.api.query.system.blockHash(blockNumber);
                let blockHeader = yield this.api.rpc.chain.getHeader(blockHash);
                let encodedPreDigest = blockHeader.digest.logs[0].toHuman().PreRuntime[1];
                const predigest = this.registry.createType('PreDigest', encodedPreDigest);
                let sk = hexToU8a(predigest.secret.toString());
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
