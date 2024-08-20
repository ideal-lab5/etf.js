// Encryption to the Future
// This class initializes the ETF.js SDK
//
// see: https://polkadot.js.org/docs/api/FAQ/#since-upgrading-to-the-7x-series-typescript-augmentation-is-missing
import '@polkadot/api-augment'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { ScProvider } from '@polkadot/rpc-provider'
import * as Sc from '@substrate/connect'
import { BN, BN_ONE } from "@polkadot/util";
import { build_encoded_commitment, encrypt, decrypt, aes_decrypt } from '@ideallabs/etf-sdk'
import init from '@ideallabs/etf-sdk'
import hkdf from 'js-crypto-hkdf'; // for npm

export class Pulse {
  round: any
  randomness: any
  signature: any

  constructor(pulse: any) {
    this.round = pulse.round;
    this.randomness = pulse.randomness;
    this.signature = pulse.signature;

  }
}

// export class BeaconConfig {
//   public_key: any
//   period: any
//   genesis_time: any
//   hash: any
//   group_hash: any
//   scheme_id: any
//   metadata: any

//   constructor(config: any) {
//     this.public_key = config.public_key
//     this.period = config.period
//     this.genesis_time = config.genesis_time
//     this.hash = config.hash
//     this.group_hash = config.group_hash
//     this.scheme_id = config.scheme_id
//     this.metadata = config.metadata
//   }
// }

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
        ...extraTypes, Pulse
      }
    })
    await init();
    await this.api.isReady

    this.ibePubkey = await this.api.query.etf.roundPublic()
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
  subscribeBeacon(callback: any): void {
    this.api.rpc.beefy.subscribeJustifications((sig) => {
      callback(new Justfication(sig.toHuman()["V1"]))
    })
  }

  /**
   * Query a pulse from runtime storage, could be empty
   * @param blockNumber: The block number of the pulse you want returned
   * @returns: Pulse of randomness
   */
  async getPulse(blockNumber): Promise<Pulse>{
    return this.api.query.randomnessBeacon.pulses(blockNumber).then(pulse => {
      return new Pulse(pulse.toHuman());
    });
  }

  /**
   * Timelock Encryption: Encrypt the message for the given block
   * @param message: The message to encrypt
   * @param blockNumber: The block number when the message unlocks
   * @param seed: A seed to derive crypto keys
   * @returns the ciphertext
   */
  encrypt(message: string, blockNumber: number, seed: string): Promise<String> {
    // TODO: fine for now but should ultimately query the BABE pallet config instead
    let epochLength = 200;
    let validatorSetId = blockNumber % epochLength;
    let t = new TextEncoder();
    let masterSecret = t.encode(seed);
    return hkdf.compute(masterSecret, this.HASH, this.HASHLENGTH, '').then((derivedKey) => {
      let commitment = build_encoded_commitment(blockNumber, validatorSetId);
      let encodedCommitment = t.encode(commitment);
      let ct = encrypt(encodedCommitment, t.encode(message), derivedKey, this.ibePubkey)
      return ct;
    });
  }


  /**
   * Timelock decryption: Decrypt the ciphertext using a pulse from the beacon produced at the given block
   * @param ciphertext: Ciphertext to be decrypted
   * @param blockNumber: Block number that has the signature for decryption
   * @returns: Plaintext of encrypted message
   */
  async decrypt(ciphertext, blockNumber) {
    return this.getPulse(blockNumber).then(pulse => {
      let sig = [pulse.signature];
      return decrypt(ciphertext, sig);
    });
  }

  async earlyDecrypt(ciphertext, seed) {
    let t = new TextEncoder();
    let masterSecret = t.encode(seed);
    return hkdf.compute(masterSecret, this.HASH, this.HASHLENGTH, '').then((derivedKey) => {
      let pt = aes_decrypt(ciphertext, derivedKey);
      return pt;
    });

  }


}
