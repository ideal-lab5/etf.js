import { describe, expect } from '@jest/globals'
import { Etf } from './etf'
import { DistanceBasedSlotScheduler } from './schedulers'
import { ApiPromise } from '@polkadot/api'

import chainSpec from './test/etfTestSpecRaw.json';

describe('DistanceBasedSlotScheduler', () => {
  it('should generate a valid schedule', () => {
    const scheduler = new DistanceBasedSlotScheduler()

    const currentSlot = 10
    const distance = 5
    const slotAmount = 3

    const schedule = scheduler.generateSchedule({
      slotAmount,
      currentSlot,
      distance,
    })

    expect(schedule).toBeDefined()
    expect(schedule.length).toBe(slotAmount)

    // Check if the generated slots are within the expected range
    schedule.forEach((slot) => {
      expect(slot).toBeGreaterThanOrEqual(currentSlot + 2)
      expect(slot).toBeLessThanOrEqual(currentSlot + 2 + distance * 2)
      expect(slot % 2).toBe(0) // Ensure the slot is even
    })
  })

  it('should throw an error if n > distance', () => {
    const scheduler = new DistanceBasedSlotScheduler()

    const currentSlot = 10
    const distance = 5
    const slotAmount = 6 // n > distance

    expect(() => {
      scheduler.generateSchedule({
        slotAmount,
        currentSlot,
        distance,
      })
    }).toThrow('DistanceBasedSlotScheduler: Cannot sample more slots than the available ones in the provided range.')
  })
})

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
  const mockSlotScheduler = new MockSlotSchedule()

  it('should initialize correctly', async () => {
    const createSpy = jest.spyOn(ApiPromise, 'create')
    const etf = new Etf('localhost', 9944)
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
    const message = 'Hello, world!'
    const threshold = 2
    const result = etf.encrypt(message, threshold, [1, 3, 5], 'test seed')
    // Verify that the result contains the expected ciphertext
    expect(result.ct).toEqual({
      aes_ct: 'mocked-aes-ct',
      etf_ct: 'mocked-etf-ct',
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
    const message = 'Hello, world!'
    const threshold = 2
    const result = etf.encrypt(message, threshold, null, 'test seed',)
    // Verify that the result contains the expected ciphertext
    expect(result).toEqual({
      ct: "",
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
    // const slotSchedule = new SlotSchedule([1, 3, 5])

    const result = await etf.decrypt(ct, nonce, capsule, [1, 3, 5])
    expect(result).toEqual({ decrypted: 'mocked-decrypted' })
  })
})
