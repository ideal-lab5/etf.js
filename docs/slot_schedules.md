# Slot Schedules

A slot schedule refers to an ordered list of slot ids. Calculating a correct slot schedule is paramount, as an incorrectly calculated one can have consequences when decryption happens (as in, you don't know when the ciphertext can be unlocked). In ETF, the slot schedule is remiscent of a flavor of witness encryption, wherein you can only decrypt messages if you know their slot schedule.

Slot scheduling logic can be implemented by developers by implementing rules that define how to calculate a slot schedule.

## SlotScheduler Interface

Developers can provide their own logic that defines the slot scheduler by implementing `SlotScheduler` interface and proving an implementation of Input data:

```typescript
export interface SlotScheduler<T> {
  generateSchedule(n: number, input: T): SlotSchedule
}
```

## Default 'distance' based slot scheduler

We provide a default distance based slot scheduler, which simply uses the current slot number and a distance (in number of slots) to calculate a terminal slot id. Then, based on user input (number of slots, threshold), we determine a slot schedule by randomly sampling slots between the terminal and next slots.
