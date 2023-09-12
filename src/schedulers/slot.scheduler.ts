import { type SlotSchedule } from './utils/slot-schedule.ts'

export type GenerateParams<T extends {}> = {
  slotAmount: number
  currentSlot: number
} & T

export abstract class SlotScheduler<T extends {}> {
  public abstract generateSchedule(params: GenerateParams<T>): SlotSchedule
}
