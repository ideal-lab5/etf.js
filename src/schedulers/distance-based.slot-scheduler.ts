import {
  GenerateParams as BaseGenerateParams,
  SlotScheduler,
} from './base.slot-scheduler.ts'

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
  public generateSchedule(params: GenerateParams): number[] {
    const { slotAmount, currentSlot, distance: rawDistance } = params

    // TODO: Check that `currentSlot` and `distance` are integers?

    const distance = Math.floor(rawDistance)

    if (slotAmount > distance) {
      throw new Error(
        'DistanceBasedSlotScheduler: Cannot sample more slots than the available ones in the provided range.'
      )
    }

    const slotIndices = this._pickDistinctIntegers(distance - 1, slotAmount)
    let schedule = []

    slotIndices.forEach((slotIndex: number) => {
      // Calculate `slotId`, ensuring it's a multiple of 2.
      const slotId = currentSlot + slotIndex * 2
      schedule.push(slotId)
    })
  
    return schedule
  }

  /**
   * _generateDistinctRandomIntegers
   *
   * Generates a prescribed amount of random integers in a
   * specified range (from 1 to `range`).
   *
   * @param {number} range - The range to generate random integers from.
   * @param {number} amount - Total amount of random integers to generate.
   * @returns {number[]} - The generated integers.
   */
  private _pickDistinctIntegers(range: number, amount: number): number[] {
    const pickedValues = new Set<number>()

    while (pickedValues.size < amount) {
      const randomNum = Math.floor(Math.random() * (range + 1)) + 2
      pickedValues.add(randomNum)
    }

    return Array.from(pickedValues).sort()
  }
}

