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
      let nextPulseIndex = this.prevPulseIndex + 1;
      let t = new TextEncoder();
      let pulseId = t.encode('0x' + this.chainId + nextPulseIndex);
      let pulseRandomness = extract_signature(pulseId, this.keypair.sk);
      let pulse = new Pulse(pulseRandomness, pulseId, nextPulseIndex);
      this.prevPulseIndex = nextPulseIndex;
      return pulse;
    }
  }