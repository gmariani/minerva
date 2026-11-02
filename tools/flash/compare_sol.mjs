// Compares two SOL files' data, ignoring key order and Dictionary entry order (ActionScript 3 writes both in hash
// order, which changes from run to run). Shared objects and cycles are compared by where they first appear.
// Usage: node compare_sol.mjs <a.sol> <b.sol>   (exit 0 when the data is the same)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const amfDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../app/src/amf');
const { default: ByteArray } = await import(path.join(amfDir, 'ByteArray.js'));
const { default: AMF0 } = await import(path.join(amfDir, 'AMF0.js'));
const { default: AMF3 } = await import(path.join(amfDir, 'AMF3.js'));

function read(file) {
    const buf = fs.readFileSync(file);
    // AMF0 references are numbered by ActionScript 2's or 3's rule; use the one where they all resolve
    for (const rule of ['as2', 'as3', 'values']) {
        const ba = new ByteArray(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
        ba.position = 16;
        ba.readUTF();
        const version = ba.readUnsignedInt();
        const amf = version === 3 ? new AMF3() : new AMF0();
        amf.referenceRule = rule;
        amf.reset();
        const body = {};
        while (ba.getBytesAvailable() > 1) {
            const key = version === 3 ? amf.readString(ba).value : ba.readUTF();
            body[key] = amf.readData(ba);
            ba.readUnsignedByte();
        }
        if (version === 3 || amf.badReferences === 0 || rule === 'values') return body;
    }
}

function canon(node, seen, at) {
    if (!node || typeof node !== 'object' || !node.__traits) return JSON.stringify(node);
    if (seen.has(node)) return '@' + seen.get(node);
    const v = node.value;
    if (!v || typeof v !== 'object' || v instanceof Date) return node.__traits.type + ':' + (v instanceof Date ? v.getTime() : JSON.stringify(v));
    seen.set(node, at);
    if (node.__traits.type === 'Dictionary') {
        return 'Dictionary[' + v.map((e) => canon(e.key, seen, at + '.key') + '=>' + canon(e.value, seen, at + '.value')).sort().join(',') + ']';
    }
    return node.__traits.type + '{' + Object.keys(v).sort().map((k) => k + ':' + canon(v[k], seen, at + '.' + k)).join(',') + '}';
}

const [a, b] = process.argv.slice(2).map((file) => {
    const body = read(file);
    const seen = new Map();
    return Object.keys(body).sort().map((k) => k + ':' + canon(body[k], seen, k)).join(',');
});
process.exit(a === b ? 0 : 1);
