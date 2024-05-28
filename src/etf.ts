// Encryption to the Future
// This class initializes the ETF.js SDK
//
// see: https://polkadot.js.org/docs/api/FAQ/#since-upgrading-to-the-7x-series-typescript-augmentation-is-missing
import '@polkadot/api-augment'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { Metadata, TypeRegistry } from '@polkadot/types'
import { hexToU8a } from '@polkadot/util'
import { ScProvider } from '@polkadot/rpc-provider'
import * as Sc from '@substrate/connect'
// import init, { EtfApiWrapper } from '@ideallabs/etf-sdk'
import { EventEmitter } from 'events'
import { BN, BN_ONE } from "@polkadot/util";

/**
 * Represents a 'justification' from the Ideal network
 */
export class Justfication {
  public commitment: any
  public signaturesFrom: any
  public validatorSetLen: any
  public signaturesCompact: any

  constructor(justification: any) {
    this.commitment = justification.commitment
    this.signaturesFrom = justification.signaturesFrom
    this.validatorSetLen = justification.validatorSetLen
    this.signaturesCompact = justification.signaturesCompact
  }

  verify(): boolean {
    // TODO
    return true;
  }

}

/**
 * Encryption to the Future
 * This class initializes the ETF.js SDK
 */
export class Etf {
  public ibePubkey: number
  public isProd: boolean
  public api!: ApiPromise
  private providerMultiAddr: string
  // private etfApi!: EtfApiWrapper


  private readonly MAX_CALL_WEIGHT2 = new BN(1_000_000_000_000).isub(BN_ONE);
  private readonly MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE);
  private readonly PROOFSIZE = new BN(1_000_000_000);

  /**
   * Constructor for the etf api
   * @param providerMultiAddr (optional): The multiaddress of an RPC node
   * e.g. insecure local node:    ws://localhost:9944 
   *      secure websocket (rpc): wss://etf1.idealabs.network:443
   */
  constructor(
    providerMultiAddr?: string,
    isProd?: boolean,
  ) {
    this.providerMultiAddr = providerMultiAddr
    this.isProd = isProd
  }

  /**
   * Connect to the chain and start etf api wrapper
   * @param chainSpec The ETF Network (raw) chain spec
   */
  async init(
    chainSpec?: string, 
    extraTypes?: any
  ): Promise<void> {
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
  }

  /**
   * A proxy to the polkadotjs api type registry creation
   */
  createType(typeName: string, typeData: any): any {
    return this.api.registry.createType(typeName, typeData);
  }

  /**
   * listens for incoming justifications and invokes the callback when new ones are streamed
   * @param callback: a callback to handle the new justifications
   */
  subscribeJustifications(callback: any): void {
    this.api.rpc.beefy.subscribeJustifications((sig) => {
      callback(new Justfication(sig.toHuman()["V1"]))
    })
  }

  encrypt(message: Uint8Array, blockNumber: number, seed: string) {
    let encodedCommitment = this.buildEncodedCommitment(blockNumber);
  }

  buildEncodedCommitment(blockNumber: number): string {
    // this function needs to obtain the expected future encoded commitment
    // that network authorities will sign later on
    return "0xTODO"
  }

  decrypt(ciphertext, blockNumber: number) {

  }
}
