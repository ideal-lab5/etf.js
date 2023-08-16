import { Compact } from "@polkadot/types";
import { BlockNumber } from "@polkadot/types/interfaces";
/**
 * The slot schedule holds a list of slot ids which are intended to be used in etf
 */
declare class SlotSchedule {
    slotIds: number[];
    constructor(slotIds: number[]);
}
export interface SlotScheduler<T> {
    generateSchedule(n: number, currentSlot: number, input: T): SlotSchedule;
}
export declare class TimeInput {
    distance: number;
    constructor(distance: number);
}
/**
 * Select slots randomly between the latest known slot and a future slot
 */
export declare class DistanceBasedSlotScheduler implements SlotScheduler<TimeInput> {
    generateSchedule(n: number, currentSlot: number, input: TimeInput): SlotSchedule;
}
/**
 * Encryption to the Future
 * This class initializes the ETF.js SDK
 * It assumes a time-based SlotScheduler
 */
export declare class Etf<T> {
    latestSlot: any;
    latestBlockNumber: Compact<BlockNumber>;
    private host;
    private port;
    private api;
    private registry;
    private etfApi;
    private slotScheduler;
    constructor(host: string, port: number, slotScheduler: SlotScheduler<T>);
    init(): Promise<void>;
    /**
     * Encrypt a message
     * @param message The message to encrypt
     * @param n The number of slots to encrypt for
     * @param schedulerInput The schedulerInput for the slot scheduler
     * @returns the ciphertext and slot schedule
     */
    encrypt(message: string, n: number, threshold: number, schedulerInput: T): {
        ct: any;
        slotSchedule: SlotSchedule;
    };
    /**
     *
     * @param ct
     * @param nonce
     * @param capsule
     * @param slotSchedule
     * @returns
     */
    decrypt(ct: Uint8Array, nonce: Uint8Array, capsule: Uint8Array, slotSchedule: SlotSchedule): Promise<any>;
    private listenForSecrets;
    getLatestSlot(): number;
}
export {};
