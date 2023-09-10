/**
 * The slot schedule holds a list of slot ids which are intended to be used in etf
 */
export class SlotSchedule {
  public slotIds: number[]
  constructor(slotIds: number[]) {
    this.slotIds = slotIds
  }
}

export interface SlotScheduler<T> {
  generateSchedule(n: number, currentSlot: number, input: T): SlotSchedule
}
