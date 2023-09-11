import { TimeInput } from './utils/time-input'
import { SlotScheduler } from './slot.scheduler'
import { SlotSchedule } from './utils/slot-schedule'

/**
 * DistanceBasedSlotScheduler
 *
 * Select slots randomly between the latest known slot and a future slot.
 */
export class DistanceBasedSlotScheduler extends SlotScheduler<TimeInput> {
  // TODO: ensure no collision
  public generateSchedule(
    n: number,
    currentSlot: number,
    input: TimeInput
  ): SlotSchedule {
    // const currentSlot = Math.floor(input.currentSlot + 1);
    const distance = Math.floor(input.distance)

    if (n > distance) {
      throw new Error('number of slots must be less than total slots')
    }

    let terminalSlot = currentSlot + 1 + distance * 2
    const slotIds: number[] = []

    // Generate n random slot IDs between currentSlot+1 and terminalSlot
    // ensuring multiples of 2
    for (let i = 0; i < n; i++) {
      const range = Math.floor((terminalSlot - currentSlot + 1) / 2)
      const randomSlot = currentSlot + 2 + Math.floor(Math.random() * range) * 2
      slotIds.push(randomSlot)
    }

    slotIds.sort()
    return new SlotSchedule(slotIds)
  }
}
