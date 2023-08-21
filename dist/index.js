import { base64, hex } from '@scure/base';
// const { base64, hex } = require('@scure/base');
// const btc = require('@scure/btc-signer');
import * as btc from "@scure/btc-signer";
import Koa from "koa";
import bodyParser from 'koa-bodyparser';
import json from "koa-json";
import logger from "koa-logger";
import Router from "koa-router";
const app = new Koa();
const router = new Router();
const reqJSON = `
{
  "inputs": {
    "0": {
      "addr": "bc1p0t40pgryukh88rhwx4ffzt28cjmhxnpm56s3382vyy22zek5wpmq8rps2l",
      "public_key": "23dfdbe72c5ee9e687946e9c17f68589d90552e37a6435da7c05c2f1fba21f15",
      "type": "p2tr",
      "tx_id": "fc5b52cff7b78fbade0c64a8046ff812f44e03d663ff97b0f4b20bd7f28e1ed6",
      "index": 1,
      "witness_utxo": {
        "script": "51207aeaf0a064e5ae738eee3552912d47c4b7734c3ba6a1189d4c2114a166d47076",
        "amount": 546
      }
    },
    "1": {
      "addr": "bc1p0t40pgryukh88rhwx4ffzt28cjmhxnpm56s3382vyy22zek5wpmq8rps2l",
      "public_key": "23dfdbe72c5ee9e687946e9c17f68589d90552e37a6435da7c05c2f1fba21f15",
      "type": "p2tr",
      "tx_id": "9fb77d422cad2a8ffcb9ed5f8270d7d1050569e222ae3c48c0f89d2a1943641e",
      "index": 0,
      "witness_utxo": {
        "script": "51207aeaf0a064e5ae738eee3552912d47c4b7734c3ba6a1189d4c2114a166d47076",
        "amount": 200000
      }
    },
    "2": {
      "addr": "bc1pxy8gsmgu5zzv0ytj7ae4pgnqkcdwaqas7xmc4szcg70zqwsj4rxss2tvhu",
      "public_key": "23dfdbe72c5ee9e687946e9c17f68589d90552e37a6435da7c05c2f1fba21f15",
      "type": "p2tr",
      "tx_id": "381b5d5ea418f44183a1971798e7fbfa6f3d1d6fd21852f052d762a258e58f1a",
      "index": 0,
      "witness_utxo": {
        "script": "5120310e886d1ca084c79172f77350a260b61aee83b0f1b78ac058479e203a12a8cd",
        "amount": 30000000
      }
    }
  },
  "outputs": {
    "0": {
      "addr": "bc1pxy8gsmgu5zzv0ytj7ae4pgnqkcdwaqas7xmc4szcg70zqwsj4rxss2tvhu",
      "value": 546
    },
    "1": {
      "addr": "bc1p0t40pgryukh88rhwx4ffzt28cjmhxnpm56s3382vyy22zek5wpmq8rps2l",
      "value": 150000
    },
    "2": {
      "addr": "3C7trrWesxpM5aHPTCPMeeBG418C5LvXbc",
      "value": 50000
    },
    "3": {
      "addr": "bc1p0t40pgryukh88rhwx4ffzt28cjmhxnpm56s3382vyy22zek5wpmq8rps2l",
      "value": 10000000
    },
    "4": {
      "addr": "bc1pxy8gsmgu5zzv0ytj7ae4pgnqkcdwaqas7xmc4szcg70zqwsj4rxss2tvhu",
      "value": 19950000
    },
    "5": {
      "addr": "3C7trrWesxpM5aHPTCPMeeBG418C5LvXbc",
      "value": 50000
    }
  }
}
`;
function base64ToUint8Array(base64) {
    const raw = atob(base64);
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        uint8Array[i] = raw.charCodeAt(i);
    }
    return uint8Array;
}
function hexToUint8Array(hex) {
    if (hex.length % 2 !== 0) {
        throw new Error('Invalid hex string');
    }
    const uint8Array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        uint8Array[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return uint8Array;
}
function uint8ArrayToHex(byteArray) {
    return Array.from(byteArray).map(byte => byte.toString(16).padStart(2, '0')).join('');
}
const parseInput = async (network, input) => {
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
        };
    }
    else if (input.type === "p2sh") {
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
    }
    else {
        throw new Error("Invalid input.type");
    }
};
router.get("/psbt/sign", async (ctx, next) => {
    const psbtSignReq = JSON.parse(reqJSON);
    const psbtB = new Uint8Array(Buffer.from(psbtSignReq.psbt64));
    const tx = btc.Transaction.fromPSBT(psbtB);
    for (const signer of psbtSignReq.signers) {
        for (const idx of signer.inputs) {
            const privKeyB = new Uint8Array(Buffer.from(signer.privateKey));
            tx.signIdx(privKeyB, idx);
        }
    }
    tx.finalize();
});
router.get("/psbt", async (ctx, next) => {
    const psbtReq = JSON.parse(reqJSON);
    const network = btc.NETWORK;
    const tx = new btc.Transaction();
    for (const key in psbtReq.inputs) {
        if (psbtReq.inputs.hasOwnProperty(key)) {
            const input = psbtReq.inputs[key];
            const inputParsed = await parseInput(network, input); // TOOD: handle err
            tx.addInput(inputParsed);
        }
    }
    for (const key in psbtReq.outputs) {
        if (psbtReq.outputs.hasOwnProperty(key)) {
            const output = psbtReq.outputs[key];
            tx.addOutputAddress(output.addr, BigInt(output.value), network);
        }
    }
    const psbt = tx.toPSBT(0);
    const psbt64 = base64.encode(psbt);
    const psbtResp = {
        // bytes: psbt,
        base64: psbt64,
    };
    ctx.body = psbtResp;
});
router.post("/psbt", async (ctx, next) => {
    const psbtReq = ctx.request.body;
    const network = btc.NETWORK;
    const tx = new btc.Transaction();
    for (const key in psbtReq.inputs) {
        if (psbtReq.inputs.hasOwnProperty(key)) {
            const input = psbtReq.inputs[key];
            const inputParsed = await parseInput(network, input); // TOOD: handle err
            tx.addInput(inputParsed);
            console.log("ooooooooooooooooooooo");
            console.log(inputParsed);
            console.log("ooooooooooooooooooooo");
        }
    }
    for (const key in psbtReq.outputs) {
        if (psbtReq.outputs.hasOwnProperty(key)) {
            const output = psbtReq.outputs[key];
            tx.addOutputAddress(output.addr, BigInt(output.value), network);
        }
    }
    const psbt = tx.toPSBT(0);
    const psbt64 = base64.encode(psbt);
    const psbtResp = {
        // bytes: psbt as btc.Bytes,
        base64: psbt64,
    };
    ctx.body = psbtResp;
});
router.post("/psbt/sign", async (ctx, next) => {
    const psbtSignReq = ctx.request.body;
    const psbtB = base64ToUint8Array(psbtSignReq.psbt64);
    const tx = btc.Transaction.fromPSBT(psbtB);
    for (const signer of psbtSignReq.signers) {
        for (const idx of signer.inputs) {
            const privKeyB = hexToUint8Array(signer.privateKey);
            tx.signIdx(privKeyB, idx, [btc.SignatureHash.SINGLE, btc.SignatureHash.ANYONECANPAY]);
        }
    }
    tx.finalize();
    ctx.body = tx.hex;
});
// app.use(json());
app.use(logger());
app.use(json());
app.use(bodyParser());
app.use(router.routes()).use(router.allowedMethods());
app.listen(3001, () => {
    console.log("server started on port: 3001");
});
//# sourceMappingURL=index.js.map