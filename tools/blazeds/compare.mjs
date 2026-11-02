// Checks Minerva's AMF readers against BlazeDS (Adobe's open-sourced AMF implementation).
// Reads each SOL with app/src/amf and compares the values with SolCheck.java's output.
// Usage: node compare.mjs <blazeds.jsonl> <file.sol>...
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const amfDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../app/src/amf');
const { default: ByteArray } = await import(path.join(amfDir, 'ByteArray.js'));
const { default: AMF0 } = await import(path.join(amfDir, 'AMF0.js'));
const { default: AMF3 } = await import(path.join(amfDir, 'AMF3.js'));

// Files where Minerva and BlazeDS are known to disagree, and why
const KNOWN = {
    // BlazeDS numbers AMF0 references by objects from 0, as the AMF0 spec says; Flash Player's ActionScript 2
    // numbers the SharedObject's data object as 0 and also counts XML documents (see the README)
    'AS2-half-life-2-flash.sol': 'AMF0 reference numbering',
    'fishtycoon.sol': 'AMF0 reference numbering',
    'self-referential.sol': 'AMF0 reference numbering',
    'Test-AMF0-References.sol': 'AMF0 reference numbering',
    // BlazeDS reads AMF0 strings with Java's modified UTF-8, which rejects 4-byte characters (emoji)
    'Test-AMF0-Strings.sol': 'BlazeDS AMF0 rejects 4-byte UTF-8',
    // Java's Hashtable can't hold a dictionary that is its own key
    'AMF3-self-referential-dict.sol': 'BlazeDS limitation',
    // A made-up externalizable class: its data can't be decoded without the class
    'AMF3-externalizable-object-back-reference.sol': 'undecodable by design',
    // Truncated
    '2.sol': 'truncated file',
    // Unusual header that BlazeDS (and Ruffle) don't accept
    '00000004.sol': 'non-standard header',
};

function knownDifference(name) {
    // Written by Flash Player 11 with AMF0: BlazeDS's reference numbering (and its UTF-8) don't match Flash's
    if (/^Flash11-AS(2|3-AMF0)-/.test(name)) return 'Flash Player AMF0 reference numbering';
    return KNOWN[name];
}

// Minerva's reading of a SOL, in SolCheck.java's JSON conventions
function readSOL(file) {
    const buf = fs.readFileSync(file);
    const ba = new ByteArray(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
    ba.position = 16;
    ba.readUTF(); // SOL name
    const version = ba.readUnsignedInt();
    const start = ba.position;
    // AMF0 references are numbered one of several ways; keep the first reading where they all resolve, as SOLReaderWorker does
    for (const rule of version === 3 ? ['as2'] : ['as2', 'as3', 'values']) {
        const amf = version === 3 ? new AMF3() : new AMF0();
        amf.referenceRule = rule;
        amf.reset();
        ba.position = start;
        const nodes = {};
        while (ba.getBytesAvailable() > 1) {
            const key = version === 3 ? amf.readString(ba).value : ba.readUTF();
            nodes[key] = amf.readData(ba);
            ba.readUnsignedByte(); // padding
        }
        if (version === 3 || amf.badReferences === 0 || rule === 'values') {
            const body = {};
            for (const key of Object.keys(nodes)) body[key] = toJSON(nodes[key], new Set());
            return body;
        }
    }
}

function toJSON(node, ancestors) {
    if (!node || !node.__traits) return null;
    const type = node.__traits.type;
    const v = node.value;
    switch (type) {
        case 'Number':
        case 'Double':
        case 'Integer':
            return Number.isFinite(v) ? v : String(v);
        case 'Boolean':
        case 'True':
        case 'False':
            return type === 'True' || (type !== 'False' && !!v);
        case 'String':
        case 'LongString':
        case 'XML':
        case 'XMLDocument':
            return v;
        case 'Date':
            return { $date: new Date(v).getTime() };
        case 'ByteArray':
            return Array.from(v);
        case 'Null':
        case 'Undefined':
            return null;
    }
    if (ancestors.has(node)) return { $cycle: true };
    ancestors.add(node);
    try {
        if (type === 'Dictionary') return { $dict: v.map((item) => [toJSON(item.key, ancestors), toJSON(item.value, ancestors)]) };
        const keys = Object.keys(v);
        const list = Array.isArray(v) && keys.every((k, i) => k === String(i));
        const out = list ? [] : {};
        for (const k of keys) out[k] = toJSON(v[k], ancestors);
        return out;
    } finally {
        ancestors.delete(node);
    }
}

function eq(a, b, at, diffs) {
    const isObj = (x) => x !== null && typeof x === 'object';
    if (isObj(b) && b.$xml) return typeof a === 'string' || diffs.push(`${at}: ${JSON.stringify(a)?.slice(0, 40)} vs XML`);
    if (typeof a === 'number' && typeof b === 'number') return a === b || Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a)) || diffs.push(`${at}: ${a} vs ${b}`);
    if (!isObj(a) || !isObj(b)) return a === b || diffs.push(`${at}: ${JSON.stringify(a)?.slice(0, 50)} vs ${JSON.stringify(b)?.slice(0, 50)}`);
    if (a.$dict || b.$dict) {
        if (!a.$dict || !b.$dict) return diffs.push(`${at}: dictionary vs not`);
        // Entries are unordered (Java's Hashtable), so match each one up
        const left = [...b.$dict];
        for (const entry of a.$dict) {
            const i = left.findIndex((other) => {
                const d = [];
                eq(entry, other, '', d);
                return d.length === 0;
            });
            if (i === -1) return diffs.push(`${at}: no BlazeDS entry matches ${JSON.stringify(entry).slice(0, 60)}`);
            left.splice(i, 1);
        }
        return left.length === 0 || diffs.push(`${at}: BlazeDS has extra dictionary entries`);
    }
    // BlazeDS turns a Flex ArrayCollection into a plain list; Minerva keeps the object and its source array
    if (!Array.isArray(a) && Array.isArray(b) && Object.keys(a).length === 1 && 'source' in a) return eq(a.source, b, at + '.source', diffs);
    // An array and an object with the same index keys are the same AMF value
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length || ka.some((k) => !(k in b))) return diffs.push(`${at}: keys ${JSON.stringify(ka.slice(0, 6))} vs ${JSON.stringify(kb.slice(0, 6))}`);
    for (const k of ka) if (diffs.length < 3) eq(a[k], b[k], `${at}.${k}`, diffs);
}

const [jsonl, ...files] = process.argv.slice(2);
const blazeds = Object.fromEntries(
    fs
        .readFileSync(jsonl, 'utf8')
        .trim()
        .split('\n')
        .map((line) => {
            const o = JSON.parse(line);
            return [o.file, o];
        })
);

let same = 0;
let known = 0;
const failures = [];
for (const file of files) {
    const name = path.basename(file);
    const theirs = blazeds[name];
    let problem = null;
    if (!theirs?.ok) {
        problem = 'BlazeDS could not read it: ' + (theirs?.error ?? 'no output');
    } else {
        const diffs = [];
        try {
            eq(readSOL(file), theirs.data, '', diffs);
        } catch (e) {
            diffs.push('Minerva could not read it: ' + e.message);
        }
        if (diffs.length) problem = diffs.slice(0, 3).join(' | ');
    }
    if (!problem) same++;
    else if (knownDifference(name)) known++;
    else failures.push(`${name}: ${problem}`);
}

console.log(`Same values as BlazeDS: ${same} / ${files.length}  (known differences: ${known}, unexpected: ${failures.length})`);
for (const f of failures) console.log('  ' + f);
process.exit(failures.length ? 1 : 0);
