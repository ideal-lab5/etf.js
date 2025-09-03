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

import { describe, expect } from '@jest/globals'
import { Errors, Etf } from './etf'
import { ApiPromise } from '@polkadot/api'
import {
  DrandIdentityBuilder,
  SupportedCurve,
  Timelock,
} from '@ideallabs/timelock.js'
import hkdf from 'js-crypto-hkdf'

describe('Etf', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('should construct', async () => {
    const api = await ApiPromise.create()
    const ibePubkey = 0
    const etf = new Etf(api, ibePubkey)
    expect(etf.api).toBe(api)
    expect(etf.pubkey).toBe(ibePubkey)
  })

  it('should build correctly', async () => {
    const tlockSpy = jest.spyOn(Timelock, 'build')
    const api = await ApiPromise.create()
    const ibePubkey = 0
    const etf = new Etf(api, ibePubkey)
    await etf.build()

    expect(tlockSpy).toHaveBeenCalledWith(SupportedCurve.BLS12_381)
    tlockSpy.mockRestore()
  })

  it('should timelock encrypt a message', async () => {
    const api = await ApiPromise.create()
    const ibePubkey = 0
    const etf = new Etf(api, ibePubkey)
    await etf.build()

    const seed = new TextEncoder().encode('seed')
    const when = 123
    const message = 'Hello, world!'

    const expected = new Uint8Array([1, 2, 3, 4, 5])

    const hkdfSpy = jest.spyOn(hkdf, 'compute')
    const encryptSpy = jest.spyOn(etf.tlock, 'encrypt')
    const actual = await etf.timelockEncrypt(
      new TextEncoder().encode(message),
      when,
      seed
    )
    expect(actual).toStrictEqual(expected)
    expect(hkdfSpy).toHaveBeenCalledWith(
      seed,
      'SHA-256',
      32,
      ''
    )

    // compute an ephemeral secret from the seed material
    const esk = new Uint8Array([
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c,
      0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
      0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
    ])
    const key = Array.from(esk)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')

    expect(encryptSpy).toHaveBeenCalledWith(
      new TextEncoder().encode(message),
      when,
      DrandIdentityBuilder,
      etf.pubkey,
      key
    )
  })

  it('should produce transaction material to delay an inner transaction', async () => {
    const api = await ApiPromise.create()
    const ibePubkey = 0
    const etf = new Etf(api, ibePubkey)
    await etf.build()

    let call = [1]
    let when = 3
    let seed = new Uint8Array(32).fill(0x42)

    const createTypeSpy = jest.spyOn(etf.api.registry, 'createType')
    const txSpy = jest.spyOn(etf.api.tx.timelock, 'scheduleSealed')
    await etf.delay(call, when, seed)
    expect(createTypeSpy).toHaveBeenCalledWith('Call', call)
    expect(txSpy.mock.calls[0][0]).toEqual(when)
    expect(txSpy.mock.calls[0][1]).toEqual(0)
    expect(Array.from(txSpy.mock.calls[0][2])).toEqual(
      Array.from(new Uint8Array([1, 2, 3, 4, 5]))
    )
  })
  
})

describe('timelockEncrypt', () => {
  let api: ApiPromise
  let etf: Etf
  let hkdfSpy: jest.SpyInstance
  let encryptSpy: jest.SpyInstance

  beforeEach(async () => {
    api = await ApiPromise.create()
    const ibePubkey = 0
    etf = new Etf(api, ibePubkey)
    await etf.build()

    hkdfSpy = jest.spyOn(hkdf, 'compute')
    encryptSpy = jest.spyOn(etf.tlock, 'encrypt')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const empty = (n) => {
    return new Uint8Array(n).fill(0)
  }

  it('should timelock encrypt a message successfully', async () => {
    const seedString = 'test-seed-123'
    const seed = new TextEncoder().encode(seedString)
    const when = 1234567890
    const message = 'Hello, world!'
    const encodedMessage = new TextEncoder().encode(message)
    const expectedEncrypted = new Uint8Array([1, 2, 3, 4, 5])

    // Mock HKDF computation
    const mockEsk = new Uint8Array([
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
      0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
      0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
    ])
    const originalKey = new Uint8Array(mockEsk)
    hkdfSpy.mockResolvedValue({ key: originalKey })

    // Mock tlock encrypt
    encryptSpy.mockResolvedValue(expectedEncrypted)
    const result = await etf.timelockEncrypt(encodedMessage, when, seed)

    expect(result).toStrictEqual(expectedEncrypted)
    expect(hkdfSpy).toHaveBeenCalledWith(
      new TextEncoder().encode(seedString),
      'SHA-256',
      32,
      ''
    )

    const expectedKey = Buffer.from(mockEsk).toString('hex')
    expect(encryptSpy).toHaveBeenCalledWith(
      encodedMessage,
      when,
      DrandIdentityBuilder,
      etf.pubkey,
      expectedKey
    )
  })

  it('should clear derived key after use', async () => {
    const seed = new TextEncoder().encode('test-seed')
    const encodedMessage = new TextEncoder().encode('test message')
    const when = 1000000

    const mockEsk = { key: new Uint8Array(32).fill(0x42) }
    const originalKey = new Uint8Array(mockEsk.key)
    hkdfSpy.mockResolvedValue(mockEsk)
    encryptSpy.mockResolvedValue(new Uint8Array([1, 2, 3]))

    await etf.timelockEncrypt(encodedMessage, when, seed)

    // Verify derived key was cleared
    expect(mockEsk.key).toEqual(empty(32))
    expect(mockEsk.key).not.toEqual(originalKey)
  })

  it('should handle HKDF computation failure', async () => {
    const seed = new TextEncoder().encode('test-seed')
    const encodedMessage = new TextEncoder().encode('test message')
    const when = 1000000

    hkdfSpy.mockRejectedValue(new Error('HKDF failed'))

    await expect(
      etf.timelockEncrypt(encodedMessage, when, seed)
    ).rejects.toThrow('Encryption failed')
  })

  it('should handle tlock encryption failure', async () => {
    const seed = new TextEncoder().encode('test-seed')
    const encodedMessage = new TextEncoder().encode('test message')
    const when = 1000000

    const mockEsk = { key: new Uint8Array(32).fill(0x42) }
    hkdfSpy.mockResolvedValue(mockEsk)
    encryptSpy.mockRejectedValue(new Error('Encryption failed'))

    await expect(
      etf.timelockEncrypt(encodedMessage, when, seed)
    ).rejects.toThrow('Encryption failed')

    // Verify cleanup still happens
    expect(mockEsk.key).toEqual(empty(32))
  })

  it('should work with empty message', async () => {
    const seed = new TextEncoder().encode('test-seed')
    const encodedMessage = new Uint8Array(0) // Empty message
    const when = 1000000

    const mockEsk = new Uint8Array(32).fill(0xdd)
    const originalKey = new Uint8Array(mockEsk)
    hkdfSpy.mockResolvedValue({ key: originalKey })
    encryptSpy.mockResolvedValue(new Uint8Array([]))

    const result = await etf.timelockEncrypt(encodedMessage, when, seed)

    expect(result).toEqual(new Uint8Array([]))
    expect(encryptSpy).toHaveBeenCalledWith(
      encodedMessage,
      when,
      DrandIdentityBuilder,
      etf.pubkey,
      Buffer.from(mockEsk).toString('hex')
    )
  })

  it('should work with large messages', async () => {
    const seed = new TextEncoder().encode('test-seed')
    const largeMessage = new Uint8Array(10000).fill(0x42) // 10KB message
    const when = 1000000

    const mockEsk = new Uint8Array(32).fill(0xee)
    const originalKey = new Uint8Array(mockEsk)
    hkdfSpy.mockResolvedValue({ key: originalKey })
    encryptSpy.mockResolvedValue(new Uint8Array([1, 2, 3, 4]))

    const result = await etf.timelockEncrypt(largeMessage, when, seed)

    expect(result).toEqual(new Uint8Array([1, 2, 3, 4]))
    expect(encryptSpy).toHaveBeenCalledWith(
      largeMessage,
      when,
      DrandIdentityBuilder,
      etf.pubkey,
      Buffer.from(mockEsk).toString('hex')
    )
  })

  it('should generate different keys for different seeds', async () => {
    const seed1 = new TextEncoder().encode('seed-one')
    const seed2 = new TextEncoder().encode('seed-two')
    const encodedMessage = new TextEncoder().encode('test message')
    const when = 1000000

    const mockEsk1 = new Uint8Array(32).fill(0x11)
    const mockEsk2 = new Uint8Array(32).fill(0x22)

    // First call
    const originalKey1 = new Uint8Array(mockEsk1)
    hkdfSpy.mockResolvedValue({ key: originalKey1 })
    encryptSpy.mockResolvedValueOnce(new Uint8Array([1]))
    await etf.timelockEncrypt(encodedMessage, when, seed1)

    // Second call
    const originalKey2 = new Uint8Array(mockEsk2)
    hkdfSpy.mockResolvedValue({ key: originalKey2 })
    encryptSpy.mockResolvedValueOnce(new Uint8Array([2]))
    await etf.timelockEncrypt(encodedMessage, when, seed2)

    // Verify different keys were used
    const calls = encryptSpy.mock.calls
    const key1 = calls[0][4] // 5th parameter is the key
    const key2 = calls[1][4]

    expect(key1).not.toEqual(key2)
    expect(key1).toBe(Buffer.from(mockEsk1).toString('hex'))
    expect(key2).toBe(Buffer.from(mockEsk2).toString('hex'))
  })

  it('should validate key conversion format', async () => {
    const seed = new TextEncoder().encode('test-seed')
    const encodedMessage = new TextEncoder().encode('test message')
    const when = 1000000

    // Test with specific byte pattern
    const mockEsk = {
      key: new Uint8Array([0x00, 0x0f, 0xff, 0xa1, 0xb2, 0xc3])
    }
    hkdfSpy.mockResolvedValue(mockEsk)
    encryptSpy.mockResolvedValue(new Uint8Array([1]))

    await etf.timelockEncrypt(encodedMessage, when, seed)

    // Verify hex encoding is correct (lowercase, padded)
    const expectedKey = '000fffa1b2c3'
    expect(encryptSpy).toHaveBeenCalledWith(
      encodedMessage,
      when,
      DrandIdentityBuilder,
      etf.pubkey,
      expectedKey
    )
  })
})

describe('delay', () => {
  let api: ApiPromise
  let etf: Etf
  let timelockEncryptSpy: jest.SpyInstance
  let createTypeSpy: jest.SpyInstance
  let scheduleSeledSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  const mockCall = {
    section: 'balances',
    method: 'transfer',
    args: ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 1000000]
  }

  const mockEncodedCall = new Uint8Array([1, 2, 3, 4, 5])
  const mockCiphertext = new Uint8Array([10, 20, 30, 40, 50])
  const mockTransaction = { hash: '0x123abc' }

  beforeEach(async () => {
    api = await ApiPromise.create()
    const ibePubkey = 0
    etf = new Etf(api, ibePubkey)
    await etf.build()

    timelockEncryptSpy = jest.spyOn(etf, 'timelockEncrypt')
    createTypeSpy = jest.spyOn(etf, 'createType')
    scheduleSeledSpy = jest.spyOn(etf.api.tx.timelock, 'scheduleSealed')
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    createTypeSpy.mockReturnValue({
      toU8a: () => mockEncodedCall
    })
    timelockEncryptSpy.mockResolvedValue(mockCiphertext)
    scheduleSeledSpy.mockReturnValue(mockTransaction)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should successfully delay a call', async () => {
    const when = 1234567890
    const seed = new TextEncoder().encode('test-seed-123')

    const result = await etf.delay(mockCall, when, seed)

    expect(result).toBe(mockTransaction)
    expect(createTypeSpy).toHaveBeenCalledWith('Call', mockCall)
    expect(timelockEncryptSpy).toHaveBeenCalledWith(mockEncodedCall, when, seed)
    expect(scheduleSeledSpy).toHaveBeenCalledWith(when, 0, [...mockCiphertext])
  })

  it('should validate seed parameter correctly', async () => {
    const when = 1000000

    // Test null/undefined
    await expect(etf.delay(mockCall, when, null)).rejects.toThrow(Errors.InvalidSeedError)
    await expect(etf.delay(mockCall, when, undefined)).rejects.toThrow(Errors.InvalidSeedError)
    // Test empty Uint8Array
    await expect(etf.delay(mockCall, when, new Uint8Array(0))).rejects.toThrow(Errors.InvalidSeedError)
    // Test valid Uint8Array should work
    const validSeed = new TextEncoder().encode('valid-seed')
    await expect(etf.delay(mockCall, when, validSeed)).resolves.toBe(mockTransaction)
  })

  it('should validate call parameter', async () => {
    const when = 1000000
    const seed = new TextEncoder().encode('test-seed')

    await expect(etf.delay(null, when, seed)).rejects.toThrow(
      'Call parameter is required'
    )

    await expect(etf.delay(undefined, when, seed)).rejects.toThrow(
      'Call parameter is required'
    )
  })

  it('should validate when parameter', async () => {
    const seed = new TextEncoder().encode('test-seed')
    await expect(etf.delay(mockCall, 0, seed)).rejects.toThrow(Errors.InvalidRoundError)
    await expect(etf.delay(mockCall, -1, seed)).rejects.toThrow(Errors.InvalidRoundError)
    await expect(etf.delay(mockCall, 1.5, seed)).rejects.toThrow(Errors.InvalidRoundError)
  })

  it('should clear encoded call data after processing', async () => {
    const when = 1000000
    const seed = new TextEncoder().encode('test-seed')
    const encodedData = new Uint8Array([1, 2, 3, 4, 5])

    createTypeSpy.mockReturnValue({
      toU8a: () => encodedData
    })

    await etf.delay(mockCall, when, seed)

    // Encoded data should be cleared
    expect(encodedData).toEqual(new Uint8Array([0, 0, 0, 0, 0]))
  })

  it('should clear encoded call data even on error', async () => {
    const when = 1000000
    const seed = new TextEncoder().encode('test-seed')
    const encodedData = new Uint8Array([1, 2, 3, 4, 5])

    createTypeSpy.mockReturnValue({
      toU8a: () => encodedData
    })
    timelockEncryptSpy.mockRejectedValue(new Error('Encryption failed'))

    try {
      await etf.delay(mockCall, when, seed)
      // the call should cause an error, the test fails otherwise
      expect(false).toEqual(true)
    } catch (e) {
      // Expected to throw
    }

    // Encoded data should still be cleared
    expect(encodedData).toEqual(new Uint8Array([0, 0, 0, 0, 0]))
  })

  it('should handle timelockEncrypt failure', async () => {
    const when = 1000000
    const seed = new TextEncoder().encode('test-seed')

    timelockEncryptSpy.mockRejectedValue(new Error(Errors.EncryptionError))
    await expect(etf.delay(mockCall, when, seed)).rejects.toThrow(Errors.EncryptionError)
  })
})