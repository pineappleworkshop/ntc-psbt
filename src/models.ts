
export interface WitnessUtxo {
  script: string;
  amount: number;
}

export interface Input {
  addr: string;
  public_key: string;
  type: string;
  tx_id: string;
  index: number;
  witness_utxo: WitnessUtxo;
}

export interface Output {
  addr: string;
  value: number;
}

export interface PSBTReq {
  inputs: { [key: string]: Input };
  outputs: { [key: string]: Output };
}

export interface PSBTResp {
//   bytes: Bytes
  base64: string
}

export interface PSBTSignReq {
  psbt64: string
  signers: SignerX[]
}

export interface SignerX {
  privateKey: string
  inputs: number[]
}
