/**
 * Represents a 'justification' from the Ideal network
 */
export class Justfication {
    public commitment: any
    public signaturesFrom: any
    public validatorSetLen: any
    public signaturesCompact: any
  
    constructor(justification: any) {
      this.commitment = justification.commitment
      this.signaturesFrom = justification.signaturesFrom
      this.validatorSetLen = justification.validatorSetLen
      this.signaturesCompact = justification.signaturesCompact
    }
  
    verify(): boolean {
      // TODO
      return true;
    }
  
  }

export class Pulse {
  round: any
  randomness: any
  signature: any

  constructor(round: number, randomness: string, signature: string) {
    this.round = round;
    this.randomness = randomness;
    this.signature = signature;
  }
}

export class TLECipherText {
  aes_ct: any
  etf_ct: any
  
  constructor(tleCipherText: any) {
    this.aes_ct = tleCipherText.aes_ct;
    this.etf_ct = tleCipherText.etf_ct;
  }
}