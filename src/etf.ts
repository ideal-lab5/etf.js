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
import { Timelock } from '@ideallabs/timelock.js'

/**
 * Errors that can be encountered
 */
export enum Errors {
  EncryptionError = 'Encryption failed',
  InvalidCallError = 'Call parameter is required',
  InvalidRoundError = '`when` must be a positive integer',
  InvalidSeedError = 'Seed parameter must be a non-empty Uint8Array',
  TimelockTxError = 'An error occurred while building the timelocked transaction.',
  TransitiveRuntimeError = 'Either the timelock pallet is unavailable, the pallet name has changed, or the chain is not properly configured. Upgrade to the latest etf.js version, verify your websocket is properly configured, and try again.',
  Unknown = 'An unknown error occurred!',
}

const identify = (e: Error) => {
  for (let err in Errors) {
    if (e.message === Errors[err]) {
      return e
    }
  }
  return null
}

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
   * @param pubkey The public key used in the underlying IBE scheme (for now: assume BLS12-381).
   */
  constructor(api: ApiPromise, pubkey: Uint8Array) {
    this.api = api
    this.pubkey = pubkey
  }

  async build() {
    // build the timelock instance over bls12-381
    await Timelock.build().then((tlock) => {
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
    seed: Uint8Array
  ): Promise<any> {
    let esk: { key: Uint8Array | null } = { key: null }

    try {
      // compute an ephemeral secret from the seed material
      esk = await hkdf.compute(seed, this.HASH, this.HASHLENGTH, '')
      const result = await this.tlock.encrypt(
        encodedMessage,
        when,
        esk.key,
        this.pubkey
      )
      return result
    } catch (e) {
      throw new Error(
        Errors.EncryptionError +
          `: ${e instanceof Error ? e.message : 'Unknown error'}`
      )
    } finally {
      // cleanup sensitive data
      if (esk.key && esk.key.fill) {
        esk.key.fill(0)
      }
    }
  }

  /**
   * Prepare a secure delayed transaction for a given deadline.
   *
   * ex:
   * etf.delay(
   *  api.tx.balances
   *    .transferKeepAlive(BOB, 100), 477382, new TextEncoder().encode('my-secret-seed'))
   *    .signAndSend(alice, result => {...})
   *
   * @param call: The call to delay
   * @param when: The round for which the call should be executed (a positive integer)
   * @param seed: A seed to input to the timelock encryption function,
   *              used to produced a determistic seed with an HKDF
   * @returns A call to lock the transactions until the deadline
   */
  async delay(call, when, seed: Uint8Array): Promise<any> {
    let encodedCall: Uint8Array | null = null
    try {
      // input validations
      if (!call) throw new Error(Errors.InvalidCallError)
      if (!Number.isInteger(when) || when <= 0)
        throw new Error(Errors.InvalidRoundError)
      if (!seed || seed.length === 0) throw new Error(Errors.InvalidSeedError)

      const innerCall = this.createType('Call', call)
      encodedCall = innerCall.toU8a()
      let ciphertext = await this.timelockEncrypt(encodedCall, when, seed)
      return this.api.tx.timelock.scheduleSealed(when, [...ciphertext])
    } catch (e) {
      if (e instanceof Error) {
        if (identify(e)) throw e
        else throw new Error(Errors.TransitiveRuntimeError)
      }

      throw new Error(Errors.Unknown + ' ' + e)
    } finally {
      // cleanup
      if (encodedCall) encodedCall.fill(0)
    }
  }
}
