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

  constructor(pulse: any) {
    this.round = pulse.round;
    this.randomness = pulse.randomness;
    this.signature = pulse.signature;

  }
}

// export class BeaconConfig {
//   public_key: any
//   period: any
//   genesis_time: any
//   hash: any
//   group_hash: any
//   scheme_id: any
//   metadata: any

//   constructor(config: any) {
//     this.public_key = config.public_key
//     this.period = config.period
//     this.genesis_time = config.genesis_time
//     this.hash = config.hash
//     this.group_hash = config.group_hash
//     this.scheme_id = config.scheme_id
//     this.metadata = config.metadata
//   }
// }