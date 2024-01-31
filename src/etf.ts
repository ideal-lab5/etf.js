// Encryption to the Future
// This class initializes the ETF.js SDK
//
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
export class Etf {
  public latestSlot: any
  public latestBlockNumber: number
  public ibePubkey: number
  public isProd: boolean
  public api!: ApiPromise
  private providerMultiAddr: string
  private registry!: TypeRegistry
  private etfApi!: EtfApiWrapper
  public eventEmitter!: EventEmitter

  /**
   * Constructor for the etf api
   * @param providerMultiAddr (optional): The multiaddress of an RPC node
   * e.g. insecure local node:    ws://localhost:9944 
   *      secure websocket (rpc): wss://etf1.idealabs.network:443
   */
  constructor(providerMultiAddr?: string, isProd?: boolean) {
    this.providerMultiAddr = providerMultiAddr
    this.isProd = isProd
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
  async secrets(blockNumbers: number[]) {
    let sks = []
    for (const blockNumber of blockNumbers) {
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
    blockNumbers: number[],
    seed: string
  ) {

    if (blockNumbers === undefined || blockNumbers === null) {
      throw new Error("block numbers must not be empty");
    }

    if (Math.min(...blockNumbers) < this.latestBlockNumber) {
      throw new Error("block numbers must be in the future");
    }

    let t = new TextEncoder()
    let ids = []

    let latestSlot = this.getLatestSlot();

    for (const blockNumber of blockNumbers) {
      // convert to a slot number
      let diff = blockNumber - this.latestBlockNumber;
      if (this.isProd) diff *= 2;
      let slot = latestSlot + diff;
      ids.push(t.encode(slot.toString()))
    }
    return this.etfApi.encrypt(messageBytes, ids, threshold, t.encode(seed))
  }

  /**
   * Decrypt a timelocked ciphertext
   * @param ct: the ciphertext (AES-GCM ciphertext)
   * @param nonce: the nonce (AES-GCM)
   * @param capsule: the capsule (IBE ciphertexts)
   * @param blockNumbers: the blocks whose secrets we should use
   * @returns the original message if successful, else the empty string
   */
  async decrypt(
    ct: Uint8Array,
    nonce: Uint8Array,
    capsule: Uint8Array,
    blockNumbers: number[],
  ) {
    let sks = await this.secrets(blockNumbers)
    return this.etfApi.decrypt(ct, nonce, capsule, sks)
  }

  /**
   * Prepare a secure delayed transaction for a given deadline.
   * 
   * ex:
   * etf.delay(
   *  api.tx.balances
   *    .transferKeepAlive(BOB, 100), 477382)
   *    .signAndSend(alice, result => {...})
   * 
   * @param rawCall: The call to delay
   * @param priority: The call priority
   * @param deadline: The deadline (when the call should be executed)
   * @returns (call, sk, block) where the call is a call to schedule the delayed transaction
   */
  delay(rawCall, priority, deadline) {
    try {

      let diff = deadline - this.latestBlockNumber;
      if (this.isProd) diff *= 2;
      let targetSlot = this.getLatestSlot() + diff;

      let call = this.createType('Call', rawCall);
      let out = this.encrypt(call.toU8a(), 1, [targetSlot], new Date().toString());
      let o = {
        ciphertext: out.aes_ct.ciphertext,
        nonce: out.aes_ct.nonce,
        capsule: out.etf_ct[0],
      };

      return ({
        call: this.api.tx.scheduler.scheduleSealed(deadline, priority, o),
        sk: out.aes_ct.key,
      });
    } catch (e) {
      throw e;
    }
  }

  /**
   * listen for incoming block headers and emit an event  when new headers are encountered
   * @param eventEmitter: an event emitter from which to emit events
   */
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

  /**
   * Fetch the latest slot 
   * @returns the latest known slot as an int
   */
  public getLatestSlot() {
    return Number.parseInt(this.latestSlot.slot.replaceAll(',', ''))
  }
}
