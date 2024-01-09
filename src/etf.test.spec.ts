import { describe, expect } from '@jest/globals'
import { Etf } from './etf'
import { ApiPromise } from '@polkadot/api'

import chainSpec from './test/etfTestSpecRaw.json';

describe('Etf', () => {
  // let emitter;
  beforeEach(() => {
    jest.clearAllMocks()
    // emitter = new EventEmitter();
  })

  class MockSlotSchedule {
    generateSchedule(input) {
      return [1, 3, 5]
    }
  }

  it('should initialize correctly', async () => {
    const createSpy = jest.spyOn(ApiPromise, 'create')
    const etf = new Etf('ws://localhost:9944')
    await etf.init(JSON.stringify(chainSpec))
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: expect.anything(),
      })
    )
    createSpy.mockRestore()
  })

  it('should initialize correctly with light client', async () => {
    const createSpy = jest.spyOn(ApiPromise, 'create')
    const etf = new Etf()
    await etf.init(JSON.stringify(chainSpec))
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: expect.anything(),
      })
    )
    createSpy.mockRestore()
  })

  it('should encrypt a message', async () => {
    const etf = new Etf()
    await etf.init(JSON.stringify(chainSpec))
    const nextSlot = {
      slot: '123,456,789',
    }
    etf.latestSlot = nextSlot
    etf.latestBlockNumber = 123
    const message = new TextEncoder().encode('Hello, world!')
    const threshold = 2
    const result = etf.encrypt(message, threshold, [1, 3, 5], 'test seed')
    // Verify that the result contains the expected ciphertext
    expect(result).toEqual({
      ciphertext: {
        aes_ct: 'mocked-aes-ct',
        etf_ct: 'mocked-etf-ct',
      },
      sk: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]
    })
  })

  it('should fail to encrypt a message with an empty slot schedule', async () => {
    const etf = new Etf()
    await etf.init(JSON.stringify(chainSpec))
    const nextSlot = {
      slot: '123,456,789',
    }
    etf.latestSlot = nextSlot
    etf.latestBlockNumber = 123
    const message = new TextEncoder().encode('Hello, world!')
    const threshold = 2
    const result = etf.encrypt(message, threshold, null, 'test seed',)
    // Verify that the result contains the expected ciphertext
    expect(result).toEqual({
      ciphertext: "",
      sk: "",
    })
  })

  it('should decrypt a message', async () => {
    const etf = new Etf()
    await etf.init(JSON.stringify(chainSpec))
    const nextSlot = {
      slot: '123,456,789',
    }
    etf.latestSlot = nextSlot
    etf.latestBlockNumber = 123
    let encoder = new TextEncoder()
    const ct = encoder.encode('test1')
    const nonce = encoder.encode('test2')
    const capsule = encoder.encode('test3')

    const result = await etf.decrypt(ct, nonce, capsule, [1, 3, 5])
    expect(result).toEqual({
      message: 'mocked-decrypted', 
      sk: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]
    })
  })
})
