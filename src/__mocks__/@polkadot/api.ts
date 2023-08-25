// __mocks__/@polkadot/api.js
export class ApiPromise {
    public isReady: any;
    public rpc: any;
    public query: any;

    static create(options) {
        const mockApi = new ApiPromise();
        return Promise.resolve(mockApi);
    }

    constructor() {
        this.isReady = Promise.resolve();
        this.rpc = {
            state: {
                getMetadata: async () => ({
                toHex: () => 'mockMetadataHex'
            })},
            chain: {
                subscribeNewHeads: () => {
                    return {
                        digest: {
                          logs: [{
                            toHuman: () => ({
                              "PreRuntime": ["0xEncodedPreDigest"]
                            })
                          }]
                        },
                        number: 123
                    };
                }
            }
        };
        this.query = {
            etf: {
                ibeParams: async () => ['param1', 'param2']
            }
        };
    }   
};

export class WsProvider {
    constructor(endpoint) {
        // Store endpoint value or implement other logic
    }

    async connect() {
        // Simulate connecting logic or implement other behavior
        console.log("Mock WsProvider connected");
    }
};
