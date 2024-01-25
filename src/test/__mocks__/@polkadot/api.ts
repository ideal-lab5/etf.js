// __mocks__/@polkadot/api.js
export class ApiPromise {
  public isReady: any
  public rpc: any
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
      chain: {
        subscribeNewHeads: async () => {},
        getHeader: async () => {
          return {
            digest: {
              logs: [
                {
                  toHuman: () => {
                    return {
                      PreRuntime: [
                        {
                          // intentionally left empty
                        },
                        {
                          toJSON: () => {
                            return {
                              secret: '0x01010101010'
                            }
                          },
                        },
                      ],
                    }
                  },
                },
              ],
            },
          }
        },
      },
    }

    this.query = {
      etf: {
        ibeParams: async () => ['param1', 'param2']
      },
      system: {
        blockHash: async () => '0xBlockHash'
      },
    }

    this.registry = {
      createType: (typeName, typeData) => {
        if (typeData == "") {
          throw new Error("invalid call data")
        }
        if (typeName == "Call") {
          return new MockCall("mock-created-type");
        }
        return "";
      },
    }

    this.tx = {
      balances: {
        transferKeepAlive: (address, amount) => 
          new MockCall("mock-balance-transfer")
      },
      scheduler: {
        scheduleSealed: (target, priority, ciphertext) => 
          new MockCall("mock-schedule-sealed-call")
      }
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

export class MockCall {
  constructor(call) {

  }

  toU8a() {
    return [];
  }

}