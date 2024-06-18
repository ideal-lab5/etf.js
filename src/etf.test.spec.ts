import { describe, expect } from '@jest/globals'
import { Etf } from './etf'
import { ApiPromise } from '@polkadot/api'

import chainSpec from './test/etfTestSpecRaw.json';

describe('Etf', () => {
  // let emitter;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // emitter = new EventEmitter();
  })

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize correctly', async () => {
    const createSpy = jest.spyOn(ApiPromise, 'create')
    const etf = new Etf('ws://localhost:9944')
    await etf.init(JSON.stringify(chainSpec))
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: expect.anything(),
      })
    )
    createSpy.mockRestore()
  })

  it('should initialize correctly with light client', async () => {
    const createSpy = jest.spyOn(ApiPromise, 'create')
    const etf = new Etf()
    await etf.init(JSON.stringify(chainSpec))
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: expect.anything(),
      })
    )
    createSpy.mockRestore()
  })

  it('should call subscribeJustifications callback every 30 seconds with BeaconSim pulse', async () => {
    const mockCallback = jest.fn();
    const etf = new Etf('wss://example.com', true);

    await etf.init();

    etf.subscribeJustifications(mockCallback);

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      signaturesCompact: expect.any(String) // Assuming signature is a string
    }));

    // Fast-forward another 30 seconds
    jest.advanceTimersByTime(30000);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      signaturesCompact: expect.any(String)
    }));

    // Fast-forward another 30 seconds
    jest.advanceTimersByTime(30000);
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      signaturesCompact: expect.any(String)
    }));
  });

  it('should encrypt a message', async () => {
    const etf = new Etf()
    await etf.init(JSON.stringify(chainSpec), false)
    const seed = 'seed';
    const latestBlockNumber = 123;
    const message = 'Hello, world!'
    await etf.encrypt(message, latestBlockNumber, seed).then((result) => {
      let result_string = JSON.stringify(result);
      let expected_string = JSON.stringify({
        aes_ct: { ciphertext: [ 0 ], nonce: [ 1 ] },
        etf_ct: 'mocked-etf-ct',
        sk: [
          0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 1
        ]
      });
      expect(result_string).toBe(expected_string);
    });
  })

  
//   it('should fail if block numbers are not in the future', async () => {
//     const etf = new Etf()
//     await etf.init(JSON.stringify(chainSpec))
//     const nextSlot = {
//       slot: '123,456,789',
//     }
//     etf.latestSlot = nextSlot
//     etf.latestBlockNumber = 123
//     const message = new TextEncoder().encode('Hello, world!')
//     const threshold = 2
//     try {
//       etf.encrypt(message, threshold, [122], 'test seed')
//     } catch (e) {
//       expect(e).toStrictEqual(new Error("block numbers must be in the future"))
//     }
//   })

//   it('should fail to encrypt a message with an empty slot schedule', async () => {
//     const etf = new Etf()
//     await etf.init(JSON.stringify(chainSpec))
//     const nextSlot = {
//       slot: '123,456,789',
//     }
//     etf.latestSlot = nextSlot
//     etf.latestBlockNumber = 123
//     const message = new TextEncoder().encode('Hello, world!')
//     const threshold = 2
//     try {
//       etf.encrypt(message, threshold, [], 'test seed')
//     } catch (e) {
//       expect(e).toStrictEqual(new Error("block numbers must not be empty"))
//     }
    
//   })

//   it('should decrypt a message', async () => {
//     const etf = new Etf()
//     await etf.init(JSON.stringify(chainSpec))
//     const nextSlot = {
//       slot: '123,456,789',
//     }
//     etf.latestSlot = nextSlot
//     etf.latestBlockNumber = 123
//     let encoder = new TextEncoder()
//     const ct = encoder.encode('test1')
//     const nonce = encoder.encode('test2')
//     const capsule = encoder.encode('test3')

//     const result = await etf.decrypt(ct, nonce, capsule, [1, 3, 5])
//     expect(result).toEqual({
//       message: 'mocked-decrypted',
//       sk: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
//     })
//   })

//   it('should reject invalid call data', async () => {
//     const etf = new Etf()
//     await etf.init(JSON.stringify(chainSpec))

//     const nextSlot = {
//       slot: '123,456,789',
//     }
//     etf.latestSlot = nextSlot
//     etf.latestBlockNumber = 123


//     let deadline = 125

//     let innerCall = "";
//     try {
//       etf.delay(innerCall, 127, deadline);
//       throw new Error('the call should throw an error');
//     } catch (e) {
//       expect(e).toBeTruthy()
//     }
//   })

//   it('should construct a delayed transaction', async () => {
//     const etf = new Etf()
//     await etf.init(JSON.stringify(chainSpec))

//     const nextSlot = {
//       slot: '123,456,789',
//     }
//     etf.latestSlot = nextSlot
//     etf.latestBlockNumber = 123


//     let deadline = 123456791

//     let innerCall = etf.api.tx.balances
//       .transferKeepAlive('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', 100);
//     let outerCall = etf.delay(innerCall, 127, deadline);
//     if (outerCall instanceof Error) {
//       console.log(outerCall)
//       throw new Error('the test should not have an error');
//     } else {
//       expect(outerCall.call).toBeTruthy();
//     }
//   })
})
