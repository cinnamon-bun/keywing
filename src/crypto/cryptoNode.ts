import crypto = require('crypto');
import {
    ILowLevelCrypto,
    KeypairBuffers,
} from './cryptoTypes';
import {
    decodeSig,
    encodeSig,
} from './encoding';
import {
    EncodedSig,
} from '../util/types';

const _generateKeypairDerBuffers = (): KeypairBuffers => {
    // Typescript has outdated definitions, doesn't know about ed25519
    // so fight it with "as any"
    let pair = crypto.generateKeyPairSync(
        'ed25519' as any,
        {
            publicKeyEncoding: {
                format: 'der',
                type: 'spki',
            },
            privateKeyEncoding: {
                format: 'der',
                type: 'pkcs8',
            },
        } as any
    );
    // Typescript thinks these are strings, but they're Buffers.
    return {
        pubkey: (pair.publicKey as any as Buffer),
        secret: (pair.privateKey as any as Buffer),
    };
};

let _shortenDer = (k: KeypairBuffers): KeypairBuffers => ({
    pubkey: k.pubkey.slice(-32),
    secret: k.secret.slice(-32),
});
let _derPrefixPublic = Buffer.from('MCowBQYDK2VwAyEA', 'base64');
let _derPrefixSecret = Buffer.from('MC4CAQAwBQYDK2VwBCIEIA==', 'base64');
let _lengthenDerPublic = (b: Buffer): Buffer =>
    Buffer.concat([_derPrefixPublic, b]);
let _lengthenDerSecret = (b: Buffer): Buffer =>
    Buffer.concat([_derPrefixSecret, b]);

/**
 * A verison of the ILowLevelCrypto interface backed by native Node crypto functions.
 * Requires a recent version of Node, perhaps 12+?
 * Does not work in the browser.
 */
export const CryptoNode: ILowLevelCrypto = class {
    static sha256(input: string | Buffer): Buffer {
        return crypto.createHash('sha256').update(input).digest();
    }
    static generateKeypairBuffers(): KeypairBuffers {
        return _shortenDer(_generateKeypairDerBuffers());
    };
    static sign(keypair: KeypairBuffers, msg: string | Buffer): EncodedSig {
        if (typeof msg === 'string') { msg = Buffer.from(msg, 'utf8'); }
        // prettier-ignore
        return encodeSig(crypto.sign(
            null,
            msg,
            {
                key: _lengthenDerSecret(keypair.secret),
                format: 'der',
                type: 'pkcs8',
            }
        ));
    }
    static verify(publicKey: Buffer, sig: EncodedSig, msg: string | Buffer): boolean {
        if (typeof msg === 'string') { msg = Buffer.from(msg, 'utf8'); }
        try {
            // prettier-ignore
            return crypto.verify(
                null,
                msg,
                {
                    key: _lengthenDerPublic(publicKey),
                    format: 'der',
                    type: 'spki',
                } as any,
                decodeSig(sig),
            );
        } catch (e) {
            return false;
        }
    }
};
