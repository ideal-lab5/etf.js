"use strict";
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * @ignore Don't show this file in documentation.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var api_1 = require("@polkadot/api");
var util_crypto_1 = require("@polkadot/util-crypto");
var src_1 = require("../src");
var util_1 = require("./util");
/**
 * Entry point of the script. This script assumes a [TODO CHAIN NAME] node is running
 * locally on `http://0.0.0.0:9933`.
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var keyring, alice, block, blockHash, genesisHash, metadataRpc, _a, specVersion, transactionVersion, specName, registry, unsigned, decodedUnsigned, signingPayload, payloadInfo, signature, tx, expectedTxHash, actualTxHash, txInfo;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: 
                // Wait for the promise to resolve async WASM
                return [4 /*yield*/, (0, util_crypto_1.cryptoWaitReady)()];
                case 1:
                    // Wait for the promise to resolve async WASM
                    _b.sent();
                    keyring = new api_1.Keyring();
                    alice = keyring.addFromUri('//Alice', { name: 'Alice' }, 'sr25519');
                    console.log("Alice's SS58-Encoded Address:", (0, src_1.deriveAddress)(alice.publicKey, 42) // TODO, use correct prefix
                    );
                    return [4 /*yield*/, (0, util_1.rpcToLocalNode)('chain_getBlock')];
                case 2:
                    block = (_b.sent()).block;
                    return [4 /*yield*/, (0, util_1.rpcToLocalNode)('chain_getBlockHash')];
                case 3:
                    blockHash = _b.sent();
                    return [4 /*yield*/, (0, util_1.rpcToLocalNode)('chain_getBlockHash', [0])];
                case 4:
                    genesisHash = _b.sent();
                    return [4 /*yield*/, (0, util_1.rpcToLocalNode)('state_getMetadata')];
                case 5:
                    metadataRpc = _b.sent();
                    return [4 /*yield*/, (0, util_1.rpcToLocalNode)('state_getRuntimeVersion')];
                case 6:
                    _a = _b.sent(), specVersion = _a.specVersion, transactionVersion = _a.transactionVersion, specName = _a.specName;
                    registry = (0, src_1.getRegistry)({
                        chainName: '[TODO]',
                        specName: specName,
                        specVersion: specVersion,
                        metadataRpc: metadataRpc,
                    });
                    unsigned = src_1.methods.balances.transfer({
                        value: '90071992547409910',
                        dest: { id: '14E5nqKAp3oAJcmzgZhUD2RcptBeUBScxKHgJKU4HPNcKVf3' }, // Bob
                    }, {
                        address: (0, src_1.deriveAddress)(alice.publicKey, 42),
                        blockHash: blockHash,
                        blockNumber: registry
                            .createType('BlockNumber', block.header.number)
                            .toNumber(),
                        eraPeriod: 64,
                        genesisHash: genesisHash,
                        metadataRpc: metadataRpc,
                        nonce: 0,
                        specVersion: specVersion,
                        tip: 0,
                        transactionVersion: transactionVersion,
                    }, {
                        metadataRpc: metadataRpc,
                        registry: registry,
                    });
                    decodedUnsigned = (0, src_1.decode)(unsigned, {
                        metadataRpc: metadataRpc,
                        registry: registry,
                    });
                    console.log(
                    // TODO all the log messages need to be updated to be relevant to the method used
                    "\nDecoded Transaction\n  To: ".concat(decodedUnsigned.method.args.dest, "\n") +
                        "  Amount: ".concat(decodedUnsigned.method.args.value));
                    signingPayload = src_1.construct.signingPayload(unsigned, { registry: registry });
                    console.log("\nPayload to Sign: ".concat(signingPayload));
                    payloadInfo = (0, src_1.decode)(signingPayload, {
                        metadataRpc: metadataRpc,
                        registry: registry,
                    });
                    console.log(
                    // TODO all the log messages need to be updated to be relevant to the method used
                    "\nDecoded Transaction\n  To: ".concat(payloadInfo.method.args.dest, "\n") +
                        "  Amount: ".concat(payloadInfo.method.args.value));
                    signature = (0, util_1.signWith)(alice, signingPayload, {
                        metadataRpc: metadataRpc,
                        registry: registry,
                    });
                    console.log("\nSignature: ".concat(signature));
                    tx = src_1.construct.signedTx(unsigned, signature, {
                        metadataRpc: metadataRpc,
                        registry: registry,
                    });
                    console.log("\nTransaction to Submit: ".concat(tx));
                    expectedTxHash = src_1.construct.txHash(tx);
                    console.log("\nExpected Tx Hash: ".concat(expectedTxHash));
                    return [4 /*yield*/, (0, util_1.rpcToLocalNode)('author_submitExtrinsic', [tx])];
                case 7:
                    actualTxHash = _b.sent();
                    console.log("Actual Tx Hash: ".concat(actualTxHash));
                    txInfo = (0, src_1.decode)(tx, {
                        metadataRpc: metadataRpc,
                        registry: registry,
                    });
                    console.log(
                    // TODO all the log messages need to be updated to be relevant to the method used
                    "\nDecoded Transaction\n  To: ".concat(txInfo.method.args.dest, "\n") +
                        "  Amount: ".concat(txInfo.method.args.value, "\n"));
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error(error);
    process.exit(1);
});
