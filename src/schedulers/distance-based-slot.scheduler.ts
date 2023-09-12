import {
  GenerateParams as BaseGenerateParams,
  SlotScheduler,
} from './slot.scheduler'
import { SlotSchedule } from './utils/slot-schedule'

interface DistanceInput {
  distance: number
}

type GenerateParams = BaseGenerateParams<DistanceInput>

/**
 * DistanceBasedSlotScheduler
 *
 * Select slots randomly between the latest known slot and a future slot.
 */
export class DistanceBasedSlotScheduler extends SlotScheduler<DistanceInput> {
  /**
   * generateSchedule
   *
   * Generates a schedule of `slotAmount` random slots in a range from
   * the current slot + 1, and current slot + distance.
   *
   * @param {number} params.slotAmount - The number of slots to generate.
   * @param {number} params.currentSlot - The current slot number.
   * @param {number} params.distance - The distance (range) to sample slots from.
   * @returns {SlotSchedule}
   */
  public generateSchedule(params: GenerateParams): SlotSchedule {
    const { slotAmount, currentSlot, distance: rawDistance } = params

    // TODO: Check that `currentSlot` and `distance` are integers?

    const distance = Math.floor(rawDistance)

    if (slotAmount > distance) {
      throw new Error(
        'DistanceBasedSlotScheduler: Cannot sample more slots than the available ones in the provided range.'
      )
    }

    const slotIndexes = this._pickDistinctIntegers(distance - 1, slotAmount)
    const schedule = new SlotSchedule()

    slotIndexes.forEach((slotIndex) => {
      // Calculate `slotId`, ensuring it's a multiple of 2.
      const slotId = currentSlot + slotIndex * 2
      schedule.addSlot(slotId)
    })

    return schedule
  }

  /**
   * _generateDistinctRandomIntegers
   *
   * Generates a prescribed amount of random integers in a
   * specified range (from 0 to `range`).
   *
   * @param {number} range - The range to generate random integers from.
   * @param {number} amount - Total amount of random integers to generate.
   * @returns {number[]} - The generated integers.
   */
  private _pickDistinctIntegers(range: number, amount: number): number[] {
    const pickedValues = new Set<number>()

    while (pickedValues.size < amount) {
      const randomNum = this._generateRandomInteger(range)
      pickedValues.add(randomNum)
    }

    return Array.from(pickedValues).sort()
  }

  /**
   * _generateRandomInteger
   *
   * Generates a random integer between 0 and `range`.
   *
   * @param {number} range - The maximum pickable value.
   * @returns {number} - The generated integer.
   */
  private _generateRandomInteger(range: number): number {
    return Math.floor(Math.random() * (range + 1))
  }
}
