// /**
//  * Encryption to the Future
//  * This class initializes the ETF.js SDK
//  */
// see: https://polkadot.js.org/docs/api/FAQ/#since-upgrading-to-the-7x-series-typescript-augmentation-is-missing
import '@polkadot/api-augment'
import { ApiPromise, WsProvider } from '@polkadot/api'

import { Metadata, TypeRegistry } from '@polkadot/types'
import { hexToU8a } from '@polkadot/util'
import { ScProvider } from '@polkadot/rpc-provider'
import * as Sc from '@ideallabs/connect'
import init, { EtfApiWrapper } from '@ideallabs/etf-sdk'
import { EventEmitter } from 'events'

import chainSpec from './etfTestSpecRaw.json'

export class TimeInput {
  distance: number
  constructor(distance: number) {
    this.distance = distance
  }
}

/**
 * Select slots randomly between the latest known slot and a future slot
 */
export class DistanceBasedSlotScheduler implements SlotScheduler<TimeInput> {
  constructor() {}
  // TODO: ensure no collision
  generateSchedule(
    n: number,
    currentSlot: number,
    input: TimeInput
  ): SlotSchedule {
    // const currentSlot = Math.floor(input.currentSlot + 1);
    const distance = Math.floor(input.distance)
    if (n > distance) {
      throw new Error('number of slots must be less than total slots')
    }
    let terminalSlot = currentSlot + 1 + distance * 2
    const slotIds: number[] = []

    // Generate n random slot IDs between currentSlot+1 and terminalSlot
    // ensuring multiples of 2
    for (let i = 0; i < n; i++) {
      const range = Math.floor((terminalSlot - currentSlot + 1) / 2)
      const randomSlot = currentSlot + 2 + Math.floor(Math.random() * range) * 2
      slotIds.push(randomSlot)
    }

    slotIds.sort()
    return new SlotSchedule(slotIds)
  }
}

/**
 * Encryption to the Future
 * This class initializes the ETF.js SDK
 * It assumes a time-based SlotScheduler
 */
export class Etf<T> {
  public latestSlot: any
  public latestBlockNumber: number
  private host: string
  private port: number
  private api!: ApiPromise
  private registry!: TypeRegistry
  private etfApi!: EtfApiWrapper
  private slotScheduler!: SlotScheduler<T>
  public eventEmitter!: EventEmitter

  constructor(slotScheduler: SlotScheduler<T>, host?: string, port?: number) {
    this.host = host
    this.port = port
    this.slotScheduler = slotScheduler
    this.eventEmitter = new EventEmitter()
  }

  // connect to the chain and init wasm
  async init(): Promise<void> {
    let provider
    if (this.host == undefined && this.port == undefined) {
      let spec = JSON.stringify(chainSpec)
      provider = new ScProvider(Sc, spec)
      await provider.connect()
    } else {
      provider = new WsProvider(`ws://${this.host}:${this.port}`)
    }

    this.api = await ApiPromise.create({ provider })
    await this.api.isReady
    console.log('api is ready')
    this.registry = new TypeRegistry()

    // load metadata and predigest
    const data = await this.api.rpc.state.getMetadata()
    this.registry.register({
      PreDigest: {
        slot: 'u64',
        secret: '[u8;48]',
        proof: '([u8;48], [u8;48], [u8;32], [u8;48])',
      },
    })

    const metadata = new Metadata(this.registry, data.toHex())
    this.registry.setMetadata(metadata)
    this.listenForSecrets(this.eventEmitter)

    await init()
    console.log('wasm initialized successfully')
    const pps = await this.api.query.etf.ibeParams()
    this.etfApi = new EtfApiWrapper(pps[1], pps[2])
    console.log('etf api initialized')

    const version = String.fromCharCode(...this.etfApi.version())
    console.log('version ' + version)
  }

  /**
   * Attempt to fetch secrets from each slot, if it
   * @param slots the slots
   */
  async secrets(slots) {
    let sks = []
    let latest = this.getLatestSlot()
    for (const slotId of slots) {
      let distance = (latest - slotId) / 2
      let blockNumber = this.latestBlockNumber - distance
      let blockHash = await this.api.query.system.blockHash(blockNumber)
      let blockHeader = await this.api.rpc.chain.getHeader(blockHash)
      let encodedPreDigest =
        blockHeader.digest.logs[0].toHuman()['PreRuntime'][1]
      const predigest = this.registry.createType('PreDigest', encodedPreDigest)
      let sk: Uint8Array = hexToU8a(predigest.toJSON()['secret'].toString())
      sks.push(sk)
    }
    return sks
  }

  /**
   * Encrypt a message
   * @param message The message to encrypt
   * @param n The number of slots to encrypt for
   * @param schedulerInput The schedulerInput for the slot scheduler
   * @returns the ciphertext and slot schedule
   */
  encrypt(
    message: string,
    n: number,
    threshold: number,
    seed: string,
    schedulerInput: T
  ) {
    let slotSchedule = this.slotScheduler.generateSchedule(
      n,
      this.getLatestSlot(),
      schedulerInput
    )
    let t = new TextEncoder()
    let ids = []
    for (const id of slotSchedule.slotIds) {
      ids.push(t.encode(id.toString()))
    }
    return {
      ct: this.etfApi.encrypt(message, ids, threshold, seed),
      slotSchedule: slotSchedule,
    }
  }

  /**
   * Decrypt the ciphertext
   * @param ct
   * @param nonce
   * @param capsule
   * @param slotSchedule
   * @returns
   */
  async decrypt(
    ct: Uint8Array,
    nonce: Uint8Array,
    capsule: Uint8Array,
    slotSchedule: SlotSchedule
  ) {
    let slotIds: number[] = slotSchedule.slotIds
    let sks = await this.secrets(slotIds)
    return this.etfApi.decrypt(ct, nonce, capsule, sks)
  }

  // listen for incoming block headers and emit an event
  // when new headers are encountered
  // currently stores no history
  listenForSecrets(eventEmitter: EventEmitter): void {
    this.api.rpc.chain.subscribeNewHeads((header) => {
      // read the predigest from each block
      const encodedPreDigest = header.digest.logs[0].toHuman()['PreRuntime'][1]
      const predigest = this.registry.createType('PreDigest', encodedPreDigest)
      let latest = predigest.toHuman()
      this.latestSlot = latest
      this.latestBlockNumber = header['number'].toNumber()
      eventEmitter.emit('blockHeader', latest)
    })
  }

  public getLatestSlot() {
    return Number.parseInt(this.latestSlot.slot.replaceAll(',', ''))
  }
}
