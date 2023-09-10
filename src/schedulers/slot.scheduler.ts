import { type SlotSchedule } from './utils/slot-schedule'

export abstract class SlotScheduler<T> {
  public abstract generateSchedule(
    n: number,
    currentSlot: number,
    input: T
  ): SlotSchedule
}
