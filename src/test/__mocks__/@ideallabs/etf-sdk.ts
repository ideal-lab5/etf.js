// __mocks__/@ideallabs/etf-sdk.ts

// Mocked implementation of init
export default async function init() {
  // Mock initialization logic
}

// Mocked implementation of EtfApiWrapper
export class EtfApiWrapper {
  constructor(pp1: any, pp2: any) {
    // Mock constructor logic
  }

  version() {
    return [1, 2, 3] // Mock version
  }

  encrypt(message_bytes, slot_id_bytes, t) {
    return {
      aes_ct: {
        ciphertext: [0],
        nonce: [1],
      },
      etf_ct: 'mocked-etf-ct',
      sk: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]
    }
  }

  decrypt(ciphertext_bytes, nonce_bytes, capsule_bytes, sks_bytes) {
    return {
      message: 'mocked-decrypted',
      sk: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]
    }
  }
}
