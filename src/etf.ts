// Encryption to the Future
// This class initializes the ETF.js SDK
//
// see: https://polkadot.js.org/docs/api/FAQ/#since-upgrading-to-the-7x-series-typescript-augmentation-is-missing
// import '@polkadot/api-augment'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { Metadata, TypeRegistry } from '@polkadot/types'
import { hexToU8a } from '@polkadot/util'
import { ScProvider } from '@polkadot/rpc-provider'
import * as Sc from '@substrate/connect'
// import init, { EtfApiWrapper } from '@ideallabs/etf-sdk'
import { EventEmitter } from 'events'
import { BN, BN_ONE } from "@polkadot/util";
import { build_encoded_commitment, encrypt, decrypt } from '@ideallabs/etf-sdk'
import init from '@ideallabs/etf-sdk'
import hkdf from 'js-crypto-hkdf'; // for npm

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
  public ibePubkey: any
  public isProd: boolean
  public api!: ApiPromise
  private providerMultiAddr: string
  // private etfApi!: EtfApiWrapper
  private readonly MAX_CALL_WEIGHT2 = new BN(1_000_000_000_000).isub(BN_ONE);
  private readonly MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE);
  private readonly PROOFSIZE = new BN(1_000_000_000);
  private readonly HASH = 'SHA-256';
  private readonly HASHLENGTH = 32; 

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
    await init();
    await this.api.isReady
    console.log('api is ready')

    // this.api.query
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

  encrypt(message: string, blockNumber: number, seed: string): Promise<String> {
    // TODO: we need to calculate the future validator set id using
    // the diff between current block number and target block number divided by session length
    let validator_set_id = 1;
    // let setId = this.api.query.beefy.validatorSetId().then((id) => {
    //   return id + 1;
    // })
    let t = new TextEncoder();
    let masterSecret = t.encode(seed);
    return hkdf.compute(masterSecret, this.HASH, this.HASHLENGTH, '').then((derivedKey) => {
      let commitment = build_encoded_commitment(blockNumber, validator_set_id);
      let encodedCommitment = t.encode(commitment);
      let ct = encrypt(encodedCommitment, t.encode(message), derivedKey, this.ibePubkey)
      return ct;
    });
  }

  decrypt(ciphertext, justification) {
    let bls_sigs = justification.signaturesCompact;
    return decrypt(ciphertext, bls_sigs);
  }
}
