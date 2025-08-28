/*
 * Copyright 2025 by Ideal Labs, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Encryption to the Future
// This class initializes the ETF.js SDK
//
// see: https://polkadot.js.org/docs/api/FAQ/#since-upgrading-to-the-7x-series-typescript-augmentation-is-missing
import '@polkadot/api-augment'
import { ApiPromise } from '@polkadot/api'
import hkdf from 'js-crypto-hkdf'
import {
  DrandIdentityBuilder,
  SupportedCurve,
  Timelock,
} from '@ideallabs/timelock.js'

/**
 * Encryption to the Future
 * This class initializes the ETF.js SDK
 */
export class Etf {
  // a @polkadot/api `ApiPromise`
  public api!: ApiPromise
  // the public key of the IBE scheme
  public pubkey: any
  // a timelock instance
  public tlock: Timelock

  // use sha256 for hashing in hkdf
  private readonly HASH = 'SHA-256'
  // it outputs a [u8;32]
  private readonly HASHLENGTH = 32

  /**
   * constructor
   * @param api A @polkadot/api ApiPromise
   * @param pubkey The public key used in the underlying IBE scheme (for now: assume BLS12-381)
   */
  constructor(api: ApiPromise, pubkey: any) {
    this.api = api
    this.pubkey = pubkey
  }

  async build() {
    // build the timelock instance over bls12-381
    await Timelock.build(SupportedCurve.BLS12_381).then((tlock) => {
      this.tlock = tlock
    })
  }

  /**
   * A proxy to the polkadotjs api type registry creation
   */
  createType(typeName: string, typeData: any): any {
    return this.api.registry.createType(typeName, typeData)
  }

  /**
   * A utility function to fetch the latest drand round number
   * @returns
   */
  async getDrandRoundNumber() {
    try {
      const response = await fetch(
        'https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971/public/latest'
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.round
    } catch (error) {
      console.error('Error fetching drand data:', error)
      throw error
    }
  }

  /**
   * Timelock Encryption: Encrypt the message for the given block
   * @param encodedMessage: The encoded message to encrypt
   * @param blockNumber: The block number when the message unlocks
   * @param seed: A seed to derive crypto keys
   * @returns the ciphertext
   */
  async timelockEncrypt(
    encodedMessage: Uint8Array,
    when: number,
    seed: string
  ): Promise<any> {
    let t = new TextEncoder()
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
   *    .transferKeepAlive(BOB, 100), 477382, 'my-secret-seed')
   *    .signAndSend(alice, result => {...})
   *
   * @param call: The call to delay
   * @param when: The round for which the call should be executed
   * @param seed: A seed to input to the timelock encryption function,
   *              used to produced a determistic seed with an HKDF
   * @returns A call to lock the transactions until the deadline
   */
  async delay(call, when, seed): Promise<any> {
    try {
      let innerCall = this.createType('Call', call)
      let ciphertext = await this.timelockEncrypt(innerCall.toU8a(), when, seed)
      return this.api.tx.timelock.scheduleSealed(when, 0, [...ciphertext])
    } catch (e) {
      console.error(
        'An error occurred. Are you connected to the right network? ' + e
      )
      throw e
    }
  }
}
