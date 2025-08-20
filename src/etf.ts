// Encryption to the Future
// This class initializes the ETF.js SDK
//
// see: https://polkadot.js.org/docs/api/FAQ/#since-upgrading-to-the-7x-series-typescript-augmentation-is-missing
import '@polkadot/api-augment'
import { ApiPromise } from '@polkadot/api'
// import { BN, BN_ONE, hexToString, hexToU8a } from "@polkadot/util";
import hkdf from 'js-crypto-hkdf';
import { DrandIdentityBuilder, SupportedCurve, Timelock } from '@ideallabs/timelock.js';

/**
 * Encryption to the Future
 * This class initializes the ETF.js SDK
 */
export class Etf {

  // a @polkadot/api:ApiPromise
  public api!: ApiPromise 
  // the public key of the IBE scheme
  public pubkey: any
  // a timelock instance
  public tlock: Timelock

  // use sha256 for hashing in hkdf
  private readonly HASH = 'SHA-256';
  // it outputs a [u8;32]
  private readonly HASHLENGTH = 32;

  /**
   * Constructor for the etf api
   * @param providerMultiAddr (optional): The multiaddress of an RPC node
   * e.g. insecure local node:    ws://localhost:9944 
   *      secure websocket (rpc): wss://etf1.idealabs.network:443
   */
  constructor(
    api: ApiPromise,
    pubkey: any,
  ) {
    this.api = api
    this.pubkey = pubkey
  }

  async build() {
    // build the timelock instance over bls12-381
    await Timelock.build(SupportedCurve.BLS12_381).then((tlock) => {
      this.tlock = tlock;
    })
  }

  /**
   * A proxy to the polkadotjs api type registry creation
   */
  createType(typeName: string, typeData: any): any {
    return this.api.registry.createType(typeName, typeData);
  }

  /**
   * Timelock Encryption: Encrypt the message for the given block
   * @param message: The message to encrypt
   * @param blockNumber: The block number when the message unlocks
   * @param seed: A seed to derive crypto keys
   * @returns the ciphertext
   */
  async timelockEncrypt(message: string, when: number, seed: string): Promise<any> {
    let t = new TextEncoder();
    let encodedMessage = t.encode(message)
    let masterSecret = t.encode(seed);
    // compute an ephemeral secret from the seed material
    const esk = await hkdf.compute(masterSecret, this.HASH, this.HASHLENGTH, '')
    const key = Array.from(esk.key)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')

    return await this.tlock.encrypt(
      encodedMessage,
      when,
      DrandIdentityBuilder,
      this.pubkey,
      key
    )
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
   * @param when: The round for which the call should be executed
   * @returns (call, sk, block) where the call is a call to schedule the delayed transaction
   */
  async delay(call, priority, when, seed): Promise<any> {
    try {
      let innerCall = this.createType('Call', call);
      let out = await this.timelockEncrypt(innerCall.toU8a(), when, seed);
      return this.api.tx.scheduler.scheduleSealed(when, priority, out);
    } catch (e) {
      throw e;
    }
  }

  //   /**
  //    * Timelock decryption: Decrypt the ciphertext using a pulse from the beacon produced at the given block
  //    * @param ciphertext: Ciphertext to be decrypted
  //    * @param blockNumber: Block number that has the signature for decryption
  //    * @returns: Plaintext of encrypted message
  //    */
  //   timelockDecrypt(ciphertext, signature): Promise<any> {
  //     let sig: Uint8Array = hexToU8a(signature);
  //     return tld(ciphertext, sig);
  //   });
  // }

  //   /**
  //    * Decrypt a ciphertext early if you know the seed
  //    * @param ciphertext The ciphertext to decrypt
  //    * @param seed The ciphertext seed
  //    * @returns The plaintext
  //    */
  //   async decrypt(ciphertext, seed): Promise < any > {
  //   let t = new TextEncoder();
  //   let masterSecret = t.encode(seed);
  //   return hkdf.compute(masterSecret, this.HASH, this.HASHLENGTH, '').then((derivedKey) => {
  //     let pt = aes_decrypt(ciphertext, derivedKey);
  //     return pt;
  //   });
  // }

}
