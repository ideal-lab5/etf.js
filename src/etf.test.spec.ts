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

    // Fast-forward 3 seconds
    jest.advanceTimersByTime(3000);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      signaturesCompact: expect.any(Array) // Assuming signature is a string
    }));

    // Fast-forward another 3 seconds
    jest.advanceTimersByTime(3000);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      signaturesCompact: expect.any(Array)
    }));

    // Fast-forward another 3 seconds
    jest.advanceTimersByTime(3000);
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      signaturesCompact: expect.any(Array)
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

  it('should decrypt a message', async () => {
    const etf = new Etf()
    await etf.init(JSON.stringify(chainSpec), false)
    const seed = 'seed';
    const message = 'Hello, world!'
    const result = await etf.decrypt(message, seed);
    expect(result).toEqual({
      message: 'mocked-decrypted',
      sk: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
    })
  })
  
})
