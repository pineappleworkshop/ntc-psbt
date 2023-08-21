import { base64, hex } from '@scure/base';
// const { base64, hex } = require('@scure/base');
// const btc = require('@scure/btc-signer');
import * as btc from "@scure/btc-signer";
import Koa from "koa";
import bodyParser from 'koa-bodyparser';
import json from "koa-json";
import logger from "koa-logger";
import Router from "koa-router";
import {
    Input,
    PSBTReq,
    PSBTResp,
    PSBTSignReq
} from "./models";


const app = new Koa();
const router = new Router();

function base64ToUint8Array(base64: string): Uint8Array {
    const raw = atob(base64);
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        uint8Array[i] = raw.charCodeAt(i);
    }
    return uint8Array;
}

function hexToUint8Array(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
        throw new Error('Invalid hex string');
    }
    const uint8Array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        uint8Array[i / 2] = parseInt(hex.substr(i, 2), 16);
    }

    return uint8Array;
}

function uint8ArrayToHex(byteArray: Uint8Array): string {
    return Array.from(byteArray).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

const parseInput = async (network: any, input: Input) => {
  if (input.type === "p2tr") {
    const publickey = hex.decode(input.public_key);
    const p2tr = btc.p2tr(input.public_key, undefined, network);

    return {
      txid: input.tx_id,
      index: input.index,
      witnessUtxo: {
        script: p2tr.script,
        amount: BigInt(input.witness_utxo.amount),
      },
      tapInternalKey: publickey,
      sighashType: btc.SignatureHash.SINGLE,
    }
  } else if (input.type === "p2sh") {
    const publicKey = hex.decode(input.public_key);
    const p2wpkh = btc.p2wpkh(publicKey, network);
    const p2sh = btc.p2sh(p2wpkh, network);

    return {
      txid: input.tx_id,
      index: input.index,
      witnessUtxo: {
        script: p2sh.script ? p2sh.script : Buffer.alloc(0),
        amount: BigInt(input.witness_utxo.amount),
      },
      redeemScript: p2sh.redeemScript ? p2sh.redeemScript : Buffer.alloc(0),
      witnessScript: p2sh.witnessScript,
      sighashType: btc.SignatureHash.SINGLE,
    };
  } else {
    throw new Error("Invalid input.type")
  }
}

router.post("/psbt", async (ctx: any, next: any) => {
  const psbtReq: PSBTReq = ctx.request.body;
  const network = btc.NETWORK
  const tx = new btc.Transaction();
  
  for (const key in psbtReq.inputs) {
    if (psbtReq.inputs.hasOwnProperty(key)) {
      const input = psbtReq.inputs[key];     
      const inputParsed = await parseInput(network, input); // TOOD: handle err
      tx.addInput(inputParsed)
    }
  }

  for (const key in psbtReq.outputs) {
    if (psbtReq.outputs.hasOwnProperty(key)) {
      const output = psbtReq.outputs[key];
      tx.addOutputAddress(output.addr, BigInt(output.value), network)
    }
  }
  
  const psbt = tx.toPSBT(0)
  const psbt64 = base64.encode(psbt)
  const psbtResp: PSBTResp = {
    base64: psbt64,
  }

  ctx.body = psbtResp
})

router.post("/psbt/sign", async (ctx: any, next: any) => {
  const psbtSignReq: PSBTSignReq = ctx.request.body;
  const psbtB = base64ToUint8Array(psbtSignReq.psbt64);
  const tx = btc.Transaction.fromPSBT(psbtB)

  for (const signer of psbtSignReq.signers) {
    for (const idx of signer.inputs) {
      const privKeyB = hexToUint8Array(signer.privateKey);
      tx.signIdx(privKeyB, idx, [btc.SignatureHash.SINGLE]);
    }
  }

  tx.finalize();

  ctx.body = tx.hex
})

// app.use(json());
app.use(logger());
app.use(json());
app.use(bodyParser());

app.use(router.routes()).use(router.allowedMethods());

app.listen(3001, () => {
  console.log("server started on port: 3001");
})
