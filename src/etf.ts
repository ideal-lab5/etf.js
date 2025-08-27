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

  async getDrandRoundNumber() {
    try {
      const response = await fetch('https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971/public/latest');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.round;
    } catch (error) {
      console.error('Error fetching drand data:', error);
      throw error;
    }
  }


  /**
   * Timelock Encryption: Encrypt the message for the given block
   * @param message: The message to encrypt
   * @param blockNumber: The block number when the message unlocks
   * @param seed: A seed to derive crypto keys
   * @returns the ciphertext
   */
  async timelockEncrypt(encodedMessage:  Uint8Array, when: number, seed: string): Promise<any> {
    let t = new TextEncoder()
    // let encodedMessage = t.encode(message)
    let masterSecret = t.encode(seed)
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
  async delay(call, when, seed): Promise<any> {
    try {
      let innerCall = this.createType('Call', call)
      let ciphertext = await this.timelockEncrypt(innerCall.toU8a(), when, seed);
      return this.api.tx.timelock.scheduleSealed(
        when,
        127,
        [...ciphertext]
      );
    } catch (e) {
      console.error("An error occurred. Are you connected to the right network? " + e)
      throw e
    }
  }
}
