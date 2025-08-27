import { describe, expect } from '@jest/globals'
import { Etf } from './etf'
import { ApiPromise } from '@polkadot/api'
import { DrandIdentityBuilder, SupportedCurve, Timelock } from '@ideallabs/timelock.js'
import hkdf from 'js-crypto-hkdf';
import { MockCall } from './test/__mocks__/@polkadot/api';
import { assert } from '@polkadot/util';

describe('Etf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  })

  afterEach(() => {
    jest.clearAllTimers();
  });

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
    // const tlockSpy = jest.spyOn(etf.tlock, 'encrypt')
    await etf.build()

    const seed = 'seed';
    const when = 123;
    const message = 'Hello, world!'

    const expected = new Uint8Array([1, 2, 3, 4, 5])

    const hkdfSpy = jest.spyOn(hkdf, 'compute')
    const encryptSpy = jest.spyOn(etf.tlock, 'encrypt')
    const actual = await etf.timelockEncrypt(new TextEncoder().encode(message), when, seed)
    expect(actual).toStrictEqual(expected)
    expect(hkdfSpy).toHaveBeenCalledWith(new TextEncoder().encode(seed), 'SHA-256', 32, '');

    // compute an ephemeral secret from the seed material
    const esk = new Uint8Array([
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
      0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
      0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20
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
    let seed = 'seed'

    const createTypeSpy = jest.spyOn(etf.api.registry, 'createType')
    const txSpy = jest.spyOn(etf.api.tx.scheduler, 'scheduleSealed')
    await etf.delay(call, when, seed)
    expect(createTypeSpy).toHaveBeenCalledWith('Call', call)
    expect(txSpy).toHaveBeenCalledWith(when, new Uint8Array([1,2,3,4,5]))
  })
})
