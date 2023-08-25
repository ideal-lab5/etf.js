import {describe, expect, test} from '@jest/globals';
import { DistanceBasedSlotScheduler, Etf, SlotSchedule } from './etf.ts';
import { ApiPromise } from '@polkadot/api';

import { Observable, of } from 'rxjs';
import { take } from 'rxjs/operators';

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

  class MockSlotSchedule {
    generateSchedule(n, currentSlot, input) {
      return new SlotSchedule([1, 3, 5]);
    }
  }
  const mockSlotScheduler = new MockSlotSchedule();

  it('should initialize correctly', async () => {
    const createSpy = jest.spyOn(ApiPromise, 'create');
    const etf = new Etf(mockSlotScheduler, 'localhost', 9944);
    await etf.init(false); // Passing false to use full client
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      provider: expect.anything()
    }));
    createSpy.mockRestore();
  });

  it('should initialize correctly with light client', async () => {
    const createSpy = jest.spyOn(ApiPromise, 'create');
    const etf = new Etf(mockSlotScheduler);
    await etf.init(true); // Passing true to use light client
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      provider: expect.anything()
    }));
    createSpy.mockRestore();
  });

  // it('should encrypt a message', async () => {
  //   const etf = new Etf(mockSlotScheduler);
  //   const slotSchedule = { slotIds: [1, 3, 5] };

  //   const message = 'Hello, world!';
  //   const threshold = 2; // Adjust with your mock data

  //   const result = etf.encrypt(message, 3, threshold, null); // Use your mock schedulerInput

    
  //   // Verify that the result contains the expected ciphertext
  //   expect(result.ct).toEqual(mockCiphertext);
  //   // Verify that the result contains the expected slot schedule
  //   expect(result.slotSchedule).toEqual(mockSlotSchedule);
  // });

});

