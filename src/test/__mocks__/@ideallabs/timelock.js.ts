// test/__mocks__/@ideallabs/timelock.js.ts
export class Timelock {
  constructor() {}

  static async build(curveId: string) {
    return new Timelock()
  }

  // Mocked implementation of timelock encrypt function
  encrypt(
    encodedMessage: Uint8Array,
    roundNumber: number,
    identityBuilder: any,
    beaconPublicKeyHex: string,
    ephemeralSecretKeyHex: string
  ) {
    return new Uint8Array([1, 2, 3, 4, 5])
  }

  // Mocked implementation of timelock decryption function
  decrypt(ciphertext: Uint8Array, signature: Uint8Array) {
    return new Uint8Array([5, 4, 3, 2, 1])
  }
}

export class DrandIdentityBuilder {
  constructor() {}

  build() {
    return this
  }
}

// Default export (if the package uses it)
export default {
  Timelock,
  DrandIdentityBuilder,
}
