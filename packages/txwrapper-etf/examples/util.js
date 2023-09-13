"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signWith = exports.rpcToLocalNode = void 0;
var Extrinsic_1 = require("@polkadot/types/extrinsic/v4/Extrinsic");
var txwrapper_polkadot_1 = require("@substrate/txwrapper-polkadot");
var node_fetch_1 = require("node-fetch");
/**
 * Send a JSONRPC request to the node at http://0.0.0.0:9933.
 *
 * @param method - The JSONRPC request method.
 * @param params - The JSONRPC request params.
 */
function rpcToLocalNode(method, params) {
    if (params === void 0) { params = []; }
    return (0, node_fetch_1.default)('http://0.0.0.0:9933', {
        body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: method,
            params: params,
        }),
        headers: {
            'Content-Type': 'application/json',
            connection: 'keep-alive',
        },
        method: 'POST',
    })
        .then(function (response) { return response.json(); })
        .then(function (_a) {
        var error = _a.error, result = _a.result;
        if (error) {
            throw new Error("".concat(error.code, " ").concat(error.message, ": ").concat(JSON.stringify(error.data)));
        }
        return result;
    });
}
exports.rpcToLocalNode = rpcToLocalNode;
/**
 * Signing function. Implement this on the OFFLINE signing device.
 *
 * @param pair - The signing pair.
 * @param signingPayload - Payload to sign.
 */
function signWith(pair, signingPayload, options) {
    var registry = options.registry, metadataRpc = options.metadataRpc;
    // Important! The registry needs to be updated with latest metadata, so make
    // sure to run `registry.setMetadata(metadata)` before signing.
    registry.setMetadata((0, txwrapper_polkadot_1.createMetadata)(registry, metadataRpc));
    var signature = registry
        .createType('ExtrinsicPayload', signingPayload, {
        version: Extrinsic_1.EXTRINSIC_VERSION,
    })
        .sign(pair).signature;
    return signature;
}
exports.signWith = signWith;
