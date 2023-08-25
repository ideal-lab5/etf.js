import {describe, expect} from '@jest/globals';
import { DistanceBasedSlotScheduler, Etf, SlotSchedule } from './etf.ts';
import { ApiPromise } from '@polkadot/api';
import EventEmitter from 'events';

describe('DistanceBasedSlotScheduler', () => {
  it('should generate a valid schedule', () => {
    const scheduler = new DistanceBasedSlotScheduler();

    const currentSlot = 10;
    const distance = 5;
    const numberOfSlots = 3;
    const input = { currentSlot, distance };

    const schedule = scheduler.generateSchedule(numberOfSlots, currentSlot, input);

    expect(schedule).toBeDefined();
    expect(schedule.slotIds.length).toBe(numberOfSlots);
    
    // Check if the generated slots are within the expected range
    schedule.slotIds.forEach(slot => {
      expect(slot).toBeGreaterThanOrEqual(currentSlot + 1);
      expect(slot).toBeLessThanOrEqual(currentSlot + 1 + distance * 2);
      expect(slot % 2).toBe(0); // Ensure the slot is even
    });
  });

  it('should throw an error if n > distance', () => {
    const scheduler = new DistanceBasedSlotScheduler();

    const currentSlot = 10;
    const distance = 5;
    const numberOfSlots = 6; // n > distance

    const input = { currentSlot, distance };

    expect(() => {
      scheduler.generateSchedule(numberOfSlots, currentSlot, input);
    }).toThrow('number of slots must be less than total slots');
  });
});

describe('Etf', () => {

  let emitter;
  beforeEach(() => {
    jest.clearAllMocks();
    emitter = new EventEmitter();
  });

  class MockSlotSchedule {
    generateSchedule(n, currentSlot, input) {
      return new SlotSchedule([1, 3, 5]);
    }
  }
  const mockSlotScheduler = new MockSlotSchedule();

  it('should initialize correctly', async () => {
    const createSpy = jest.spyOn(ApiPromise, 'create');
    const etf = new Etf(mockSlotScheduler, emitter, 'localhost', 9944);
    await etf.init(false); 
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      provider: expect.anything()
    }));
    createSpy.mockRestore();
  });

  it('should initialize correctly with light client', async () => {
    const createSpy = jest.spyOn(ApiPromise, 'create');
    const etf = new Etf(mockSlotScheduler, emitter);
    await etf.init(true); // Passing true to use light client
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      provider: expect.anything()
    }));
    createSpy.mockRestore();
  });

  it('should encrypt a message', async () => {
    const etf = new Etf(mockSlotScheduler, emitter);
    await etf.init(true); 
    const nextSlot = {
      "slot": "123,456,789"
    };
    etf.latestSlot = nextSlot;
    etf.latestBlockNumber = 123;
    const message = 'Hello, world!';
    const threshold = 2;
    const result = etf.encrypt(message, 3, threshold, null);
    // Verify that the result contains the expected ciphertext
    expect(result.ct).toEqual({
      aes_ct: "mocked-aes-ct",
      etf_ct: "mocked-etf-ct",
    });
    // Verify that the result contains the expected slot schedule
    expect(result.slotSchedule).toEqual({"slotIds": [1, 3, 5]});
  });

  it('should decrypt a message', async () => {
    const etf = new Etf(mockSlotScheduler, emitter);
    await etf.init(true); 
    const nextSlot = {
      "slot": "123,456,789"
    };
    etf.latestSlot = nextSlot;
    etf.latestBlockNumber = 123;
    let encoder = new TextEncoder();
    const ct = encoder.encode('test1');
    const nonce = encoder.encode('test2');
    const capsule = encoder.encode('test3');
    const slotSchedule = new SlotSchedule([1, 3, 5]);

    const result = await etf.decrypt(ct, nonce, capsule, slotSchedule);
    expect(result).toEqual({ decrypted: "mocked-decrypted" });
  });
});

