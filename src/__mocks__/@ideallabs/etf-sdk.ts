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
        return [1, 2, 3]; // Mock version
    }

    encrypt(message_bytes, slot_id_bytes, t) {
        return {
            aes_ct: "mocked-aes-ct",
            etf_ct: "mocked-etf-ct",
        };
    }
    
    decrypt(ciphertext_bytes, nonce_bytes, capsule_bytes, sks_bytes) {
        return {
          decrypted: "mocked-decrypted",
        };
    }
}