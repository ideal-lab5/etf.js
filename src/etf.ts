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

/**
 * Encryption to the Future
 * This class initializes the ETF.js SDK
 * It assumes a time-based SlotScheduler
 */
export class Etf<T extends {}> {
  public latestSlot: any
  public latestBlockNumber: number
  public ibePubkey: number
  private providerMultiAddr: string
  private api!: ApiPromise
  private registry!: TypeRegistry
  private etfApi!: EtfApiWrapper
  public eventEmitter!: EventEmitter

  /**
   * Constructor for the etf api
   * @param providerMultiAddr (optional): The multiaddress of an RPC node
   * e.g. insecure local node:    ws://localhost:9944 
   *      secure websocket (rpc): wss://etf1.idealabs.network:443
   */
  constructor(providerMultiAddr?: string) {
    this.providerMultiAddr = providerMultiAddr
    this.eventEmitter = new EventEmitter()
  }

  /**
   * Connect to the chain and start etf api wrapper
   * @param chainSpec The ETF Network (raw) chain spec
   */
  async init(chainSpec?: string, extraTypes?: any): Promise<void> {
    let provider
    if (this.providerMultiAddr == undefined) {
      let spec = JSON.stringify(chainSpec)
      provider = new ScProvider(Sc, spec)
      await provider.connect()
    } else {
      provider = new WsProvider(this.providerMultiAddr)
    }

    // await cryptoWaitReady()

    this.api = await ApiPromise.create({
      provider,
      types: {
        ...extraTypes
      }
    })
    await this.api.isReady
    console.log('api is ready')
    this.registry = new TypeRegistry()

    // load metadata and predigest
    const data = await this.api.rpc.state.getMetadata()
    this.registry.register({
      PreDigest: {
        slot: 'u64',
        secret: '[u8;48]',
        proof: '[u8;224]',
      },
    })

    const metadata = new Metadata(this.registry, data.toHex())
    this.registry.setMetadata(metadata)
    this.listenForSecrets(this.eventEmitter)

    await init()
    console.log('wasm initialized successfully')
    const pps = await this.api.query.etf.ibeParams()
    this.ibePubkey = pps[1]
    this.etfApi = new EtfApiWrapper(pps[1], pps[2])
    console.log('etf api initialized')

    const version = String.fromCharCode(...this.etfApi.version())
    console.log('version ' + version)
  }

  /**
   * A proxy to the polkadotjs api type registry creation
   */
  createType(typeName: string, typeData: any): any {
    return this.api.registry.createType(typeName, typeData);
  }

  /**
   * Attempt to fetch secrets from each slot, if it
   * @param slots the slots
   */
  async secrets(slots: number[]) {
    let sks = []
    let latest = this.getLatestSlot()
    for (const slotId of slots) {
      // division by 2 since slot numbers increment by 2 but block numbers increment by 1
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
    messageBytes: Uint8Array,
    threshold: number,
    slotSchedule: number[],
    seed: string
  ) {

    if (slotSchedule === undefined || slotSchedule === null) {
      return { ciphertext: "", sk: "" }
    }

    let t = new TextEncoder()
    let ids = []
    for (const id of slotSchedule) {
      ids.push(t.encode(id.toString()))
    }
    return this.etfApi.encrypt(messageBytes, ids, threshold, t.encode(seed))
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
    slotIds: number[],
  ) {
    let sks = await this.secrets(slotIds)
    return this.etfApi.decrypt(ct, nonce, capsule, sks)
  }

  /**
   * ex:
   * 
   * etf.delay(
   *  api.tx.balances
   *    .transferKeepAlive(BOB, 100), 477382)
   *    .signAndSend(alice, result => {...})
   * 
   * @param call 
   * @param deadline 
   * @param signer 
   * @returns 
   */
  delay(rawCall, priority, deadline) {
    let call = this.createType('Call', rawCall);
    try {
      let out = this.encrypt(call.toU8a(), 1, [deadline], new Date().toString());
      let o = {
        ciphertext: out.ct.aes_ct.ciphertext,
        nonce: out.ct.aes_ct.nonce,
        capsule: out.ct.etf_ct[0],
      };

      let diffSlots = deadline - this.getLatestSlot();
      let targetBlock = this.latestBlockNumber + diffSlots;

      return ({
        call: this.api.tx.scheduler.scheduleSealed(targetBlock, priority, o),
        sk: out.ct.sk,
      });
    } catch (e) {
      return Error(e)
    }
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
