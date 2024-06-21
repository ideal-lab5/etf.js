import { extract_signature } from '@ideallabs/etf-sdk';


export class Pulse {
    public signature: any
    public id: any
    public index: any

    constructor(signature, id, index) {
      this.signature = signature;
      this.id = id;
      this.index = index;
    }
  }

  export class Pulse_V2{
    
    public commitment: string
    public signaturesFrom: string
    public validatorSetLen: number
    public signaturesCompact: [string]

    constructor(commitment, signaturesFrom, validatorSetLen, signaturesCompact) {
        this.commitment = commitment;
        this.signaturesFrom = signaturesFrom;
        this.validatorSetLen = validatorSetLen;
        this.signaturesCompact = signaturesCompact;
    }
  }
  
  export class BeaconSim {
    public chainId: any
    public keypair: any
    public prevPulseIndex: any

    constructor(chainId, keypair, genesis) {
      this.chainId = chainId;
      this.keypair = keypair;
      this.prevPulseIndex = genesis;
    }
  
    nextPulse() {
      let pulse_v2 = new Pulse_V2("commitment", "signaturesFrom", 1, ["sigs"]);
      return pulse_v2;
    }
  }