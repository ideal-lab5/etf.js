# Slot Schedules

A slot schedule refers to the future slots that we want to encrypt data for. Calculating a correct slot schedule is paramount, as an incorrectly calculated one can have consequences when decryption happens (as in, you don't know when the ciphertext can be unlocked).

Slot scheduling logic can be implemented by developers by implementing rules that define how to calculate a slot schedule.

## Time-Based Slot Schedule Calculation

A simple form of slot scheduling can be done based on time. With this, we want to take a message $m$ and encrypt it for 'X seconds in the future'. The basic idea is that we use x to calculate a range of slots, say $R = [sl_{h_1}, ..., sl_{h_k}]$ that uses target slot times and accounts for latency and lag of block production times.

Next, define $P_{min} \in (0, 1]$ to be the probability that the message should be unlocked at $sl_{h_1}$ (we assume 100% probability of unlocking at $sl_{h_k}$). Then, for any $n > 0$, we can selects slots from the interval $[sl_{now + 1}, sl_{h_k}]$ by choosing $floor(n P_{min})$ slots in $[sl_{now + 1}, sl_{h_1}]$ and $floor(n(1 - P_{min}))$ slots in $R$.

Observe, this implies that the following must hold when choosing number of shares and thresholds:

1. $n(1 - P_{min}) \leq |R|$
2. $n P_{min} \leq |sl_{h_1} - sl_{now + 1}| $
