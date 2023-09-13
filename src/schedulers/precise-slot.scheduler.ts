import {
    GenerateParams as BaseGenerateParams,
    SlotScheduler,
} from './slot.scheduler'
import { SlotSchedule } from './utils/slot-schedule'

interface PreciseInput {
    slots: number[]
}

type GenerateParams = BaseGenerateParams<PreciseInput>

/**
 * PreciseSlotScheduler
 *
 * Select slots randomly between the latest known slot and a future slot.
 */
export class PreciseSlotScheduler extends SlotScheduler<PreciseInput> {
    /**
     * generateSchedule
     *
     * Generates a schedule from the input slots
     *
     * @param {number} params.slots - the slots to encrypt to
     * @returns {SlotSchedule}
     */
    public generateSchedule(params: GenerateParams): SlotSchedule {
        const schedule = new SlotSchedule(params.slots)
        return schedule
    }
}
