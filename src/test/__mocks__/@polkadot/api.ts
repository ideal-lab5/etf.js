// __mocks__/@polkadot/api.js
export class ApiPromise {
  public isReady: any
  public rpc: any
  public drand: any
  public query: any
  public registry: any
  public tx: any

  static create(options) {
    const mockApi = new ApiPromise()
    return Promise.resolve(mockApi)
  }

  constructor() {
    this.isReady = Promise.resolve()

    this.rpc = {
      state: {
        getMetadata: async () => ({
          toHex: () => 'mockMetadataHex',
        }),
      },
    }

    this.query = {
      system: {
        blockHash: async () => '0xBlockHash',
      },
      randomnessBeacon: {
        pulses: jest.fn((when) => {
          return new Promise((resolve, reject) => {
            resolve(new MockPulse(when))
            reject(new Error())
          })
        }),
        beaconConfig: jest.fn(() => {
          return new Promise((resolve, reject) => {
            resolve(new MockBeaconConfig())
            reject(new Error())
          })
        }),
      },
    }

    this.registry = {
      createType: (typeName, typeData) => {
        if (typeData == '') {
          throw new Error('invalid call data')
        }
        if (typeName == 'Call') {
          return new MockCall('mock-created-type')
        }
        return ''
      },
    }

    this.tx = {
      balances: {
        transferKeepAlive: (address, amount) =>
          new MockCall('mock-balance-transfer'),
      },
      timelock: {
        scheduleSealed: (target, priority, ciphertext) =>
          new MockCall('mock-schedule-sealed-call'),
      },
    }
  }
}

export class WsProvider {
  constructor(endpoint) {
    // Store endpoint value or implement other logic
  }

  async connect() {
    console.log('Mock WsProvider connected')
  }
}

export class MockPulse {
  body: {
    round: any
    randomness: any
    signature: any
  }

  constructor(when: any) {
    this.body = {
      round: when,
      randomness: '0x1001001100100110011010101',
      signature: 'coleman <3 UwO',
    }
  }

  public toHuman() {
    return this
  }
}
export class MockBeaconConfig {
  public_key: any
  period: any
  genesis_time: any
  hash: any
  group_hash: any
  scheme_id: any
  metadata: any
  constructor() {
    this.public_key = 'public key'
    this.period = 'period'
    this.genesis_time = 'genesis_time'
    this.hash = 'hash'
    this.group_hash = 'group_hash'
    this.scheme_id = 'scheme_id'
    this.metadata = 'metadata'
  }
  public toHuman() {
    return this
  }
}

export class MockJustification {
  public commitment: string
  public signaturesFrom: string
  public validatorSetLen: number
  public signaturesCompact: [string]

  constructor(commitment, signaturesFrom, validatorSetLen, signaturesCompact) {
    this.commitment = commitment
    this.signaturesFrom = signaturesFrom
    this.validatorSetLen = validatorSetLen
    this.signaturesCompact = signaturesCompact
  }

  public toHuman() {
    let mockJust = new MockJustification(
      this.commitment,
      this.signaturesFrom,
      this.validatorSetLen,
      this.signaturesCompact
    )
    let toHuman = { V1: mockJust }
    return toHuman
  }
}

export class MockCall {
  constructor(call) {}

  toU8a() {
    return new Uint8Array([])
  }
}
