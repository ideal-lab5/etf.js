/**
 * SlotSchedule
 *
 * Holds a list of slot ids which are intended to be used in ETF.
 */
export class SlotSchedule {
  private _slotIds: number[]

  constructor(slotIds?: number[]) {
    this._slotIds = slotIds ?? []
  }

  /**
   * slotIds
   *
   * Getter for the inner `_slotIds` property, which can only be
   * set upon initialization.
   *
   * @returns {number[]} - The slotIds.
   */
  public get slotIds(): number[] {
    return this._slotIds
  }

  /**
   * addSlot
   *
   * Adds a slotId into the slot schedule.
   * TODO: Ensure uniqueness of the slotId?
   *
   * @param {number} slotId - The slotId to add.
   */
  public addSlot(slotId: number): void {
    this._slotIds.push(slotId)
  }
}
