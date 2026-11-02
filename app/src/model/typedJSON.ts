// JSON export/import that keeps AMF types, in superjson's layout (https://github.com/flightcontrolhq/superjson):
//
// {
//   "json": { ...the values, as plain JSON... },
//   "meta": {
//     "minerva": { "version": 1, "amfVersion": 3, "fileName": "...", "filePath": "..." },
//     "values": { "player.hp": "Integer", "player": { "type": "Object", "class": "com.Player", ... } },
//     "referentialEqualities": { "a.b": ["c", "d.e"] }
//   }
// }
//
// - "values" maps a path (keys joined with ".", where "." and "\" in a key are escaped with "\") to the
//   value's AMF type as the readers name it (Integer, LongString, Vector.<int>, ...). A bare string is
//   just the type; an object is the full traits (class, members, weakKeys, ...). Values whose type is what
//   a plain JSON import would guess are left out, so hand-added values work without an entry.
// - "referentialEqualities" lists the places that hold the same object as the first path (an object the
//   file stores once and references elsewhere, or that contains itself). Those places are null in "json".
// - Numbers that JSON can't hold are written as the strings "NaN", "Infinity" and "-Infinity".
/* eslint-disable @typescript-eslint/no-explicit-any -- works on untyped AMF node structures */
import type { NodeJSON, Traits } from '../types';
import { EDITOR_KEYS, buildSOLBody, formatObject } from './convert';

export const TYPED_JSON_VERSION = 1;

export interface TypedJSON {
    json: Record<string, any>;
    meta: {
        minerva?: { version: number; amfVersion?: number; fileName?: string; filePath?: string | null };
        values?: Record<string, string | Traits>;
        referentialEqualities?: Record<string, string[]>;
    };
}

// The file-level details of an import
export interface TypedImport {
    amfVersion: number;
    fileName?: string;
    filePath?: string | null;
    body: Record<string, any>;
}

///////////
// Paths //
///////////

const escapeKey = (key: string) => key.replace(/\\/g, '\\\\').replace(/\./g, '\\.');
const joinPath = (path: string, key: string | number) => (path ? path + '.' : '') + escapeKey(String(key));

// Types the AMF reference tables can share
function isReferenceable(type: string): boolean {
    return /^(Object|Array|ECMAArray|Dictionary|Date|XML|XMLDocument|ByteArray|Vector\.)/.test(type);
}

////////////
// Traits //
////////////

// Reader notes the writers don't use, so they needn't be exported (an array's "strict" is just whether it had named entries)
const INFO_KEYS: Record<string, 1> = { strict: 1 };

// Editor traits back to what the reader produced: the original type name, without editor flags
function readerTraits(traits: Traits): Traits {
    const t: Traits = { type: traits.type };
    for (const key in traits) if (!EDITOR_KEYS[key] && !INFO_KEYS[key] && key !== 'origType' && key !== 'type') t[key] = traits[key];
    const orig = traits.origType;
    if (orig === 'Vector.<Object>') t.type = 'Vector.<' + (traits.class || 'Object') + '>';
    else if (orig === 'True' || orig === 'False') t.type = 'Boolean'; // Follows the value, see amfBoolean
    else if (orig) t.type = orig;
    // An object's class defaults to Object
    if (t.type === 'Object' && t.class === 'Object') delete t.class;
    return t;
}

// The traits a plain JSON import would give a value
function guessTraits(val: any, amfVersion: number): Traits {
    const shallow = Array.isArray(val) ? [] : val !== null && typeof val === 'object' ? {} : val;
    const t = readerTraits(formatObject(shallow, amfVersion).__traits);
    if (t.type === 'True' || t.type === 'False') t.type = 'Boolean';
    return t;
}

// Stable form for comparing traits
function canonical(t: Traits): string {
    return JSON.stringify(Object.keys(t).sort().map((k) => [k, t[k]]));
}

const amfBoolean = (value: boolean, amfVersion: number) => (amfVersion === 3 ? (value ? 'True' : 'False') : 'Boolean');

////////////
// Export //
////////////

class Exporter {
    values: Record<string, string | Traits> = {};
    refs: Record<string, string[]> = {};
    private seen = new Map<any, string>();

    constructor(private amfVersion: number) {}

    // node is the SOL writer's input (see buildSOLBody): unedited copies of a shared object are the same object
    value(node: any, path: string): any {
        const traits = readerTraits(node.__traits);
        const type = traits.type;
        if (isReferenceable(type)) {
            const first = this.seen.get(node);
            if (first !== undefined) {
                (this.refs[first] ||= []).push(path);
                return null;
            }
            this.seen.set(node, path);
        }

        const v = node.value;
        let json: any;
        switch (type) {
            case 'Integer':
            case 'Number':
            case 'Double':
                json = typeof v === 'number' && !isFinite(v) ? String(v) : v;
                break;
            case 'Boolean':
            case 'True':
            case 'False':
                json = v === true || v === 1;
                break;
            case 'Date': {
                const d = new Date(v);
                json = isNaN(d.getTime()) ? null : d.toISOString();
                break;
            }
            case 'ByteArray':
                json = Array.from(v as ArrayLike<number>);
                break;
            case 'Null':
            case 'Undefined':
                json = null;
                break;
            case 'String':
            case 'LongString':
            case 'XML':
            case 'XMLDocument':
                json = v;
                break;
            case 'Dictionary':
                json = (v as any[]).map((item, i) => ({
                    Key: this.value(item.value.Key, joinPath(joinPath(path, i), 'Key')),
                    Value: this.value(item.value.Value, joinPath(joinPath(path, i), 'Value')),
                }));
                break;
            default: {
                // Objects, arrays and vectors. A list exports as a JSON array; an array with named entries as an object
                const keys = Object.keys(v);
                const list = type !== 'Object' && keys.every((k, i) => k === String(i));
                json = list ? [] : {};
                for (const key of keys) json[key] = this.value(v[key], joinPath(path, key));
            }
        }

        if (canonical(traits) !== canonical(guessTraits(json, this.amfVersion))) {
            this.values[path] = Object.keys(traits).length === 1 ? type : traits;
        }
        return json;
    }
}

// The tree as typed JSON. Throws like save does if a Reference points at a deleted object.
export function exportTypedJSON(root: NodeJSON): TypedJSON {
    const header = root.data!.value;
    const amfVersion = header.amfVersion;
    const body = buildSOLBody(root.children);
    const exporter = new Exporter(amfVersion);
    const json: Record<string, any> = {};
    for (const key of Object.keys(body)) json[key] = exporter.value(body[key], joinPath('', key));

    const meta: TypedJSON['meta'] = {
        minerva: { version: TYPED_JSON_VERSION, amfVersion, fileName: header.fileName },
    };
    if (root.data!.value2?.filePath) meta.minerva!.filePath = root.data!.value2.filePath;
    if (Object.keys(exporter.values).length) meta.values = exporter.values;
    if (Object.keys(exporter.refs).length) meta.referentialEqualities = exporter.refs;
    return { json, meta };
}

////////////
// Import //
////////////

// superjson's output has exactly these two keys
export function isTypedJSON(o: any): o is TypedJSON {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
    const keys = Object.keys(o);
    return keys.length === 2 && 'json' in o && 'meta' in o && !!o.json && typeof o.json === 'object' && !!o.meta && typeof o.meta === 'object';
}

// Whether a JSON value can hold a type (a hand edit may have changed a value's shape)
function fits(type: string, val: any): boolean {
    switch (type) {
        case 'Object':
        case 'ECMAArray':
            return val !== null && typeof val === 'object';
        case 'Array':
        case 'Dictionary':
            return Array.isArray(val) || (type === 'Array' && val !== null && typeof val === 'object');
        case 'Integer':
        case 'Number':
        case 'Double':
            return typeof val === 'number' || val === null || val === 'NaN' || val === 'Infinity' || val === '-Infinity';
        case 'ByteArray':
            return Array.isArray(val);
        case 'Boolean':
        case 'True':
        case 'False':
            return typeof val === 'boolean' || val === 0 || val === 1;
        case 'Date':
            return (typeof val === 'string' || typeof val === 'number') && !isNaN(new Date(val).getTime());
        case 'String':
        case 'LongString':
        case 'XML':
        case 'XMLDocument':
            return typeof val === 'string';
        case 'Null':
        case 'Undefined':
            return val === null;
    }
    if (type.startsWith('Vector.')) return Array.isArray(val);
    return false;
}

class Importer {
    // Where each path's node sits, so referentialEqualities can point it at another node
    private places = new Map<string, { container: any; key: string | number; node: any }>();

    constructor(
        private amfVersion: number,
        private values: Record<string, string | Traits>
    ) {}

    // A JSON value to the AMF readers' { __traits, value } form
    node(val: any, path: string): any {
        const note = this.values[path];
        let traits: Traits = note == null ? guessTraits(val, this.amfVersion) : typeof note === 'string' ? { type: note } : { ...note };
        if (!fits(traits.type, val)) traits = guessTraits(val, this.amfVersion);
        if (traits.type === 'Object') traits = { ...guessTraits({}, this.amfVersion), ...traits };
        const type = traits.type;

        let value: any;
        switch (type) {
            case 'Integer':
            case 'Number':
            case 'Double':
                value = val === null ? NaN : Number(val);
                break;
            case 'Boolean':
            case 'True':
            case 'False':
                value = val === true || val === 1;
                traits.type = amfBoolean(value, this.amfVersion);
                break;
            case 'Date':
                value = new Date(val);
                break;
            case 'ByteArray':
                value = (val as any[]).map((b) => Number(b) & 0xff);
                break;
            case 'Null':
            case 'Undefined':
                value = null;
                break;
            case 'String':
            case 'LongString':
            case 'XML':
            case 'XMLDocument':
                value = val;
                break;
            case 'Dictionary':
                value = (val as any[]).map((item, i) => {
                    const at = joinPath(path, i);
                    const entry: any = { __traits: { type: 'DictionaryItem' } };
                    entry.key = this.place(entry, 'key', item?.Key ?? null, joinPath(at, 'Key'));
                    entry.value = this.place(entry, 'value', item?.Value ?? null, joinPath(at, 'Value'));
                    return entry;
                });
                break;
            default:
                // Objects, arrays (an array's named entries are kept as properties) and vectors
                value = type === 'Object' || type === 'ECMAArray' ? {} : [];
                for (const key of Object.keys(val)) value[key] = this.place(value, key, val[key], joinPath(path, key));
        }
        return { __traits: traits, value };
    }

    place(container: any, key: string | number, val: any, path: string): any {
        const node = this.node(val, path);
        this.places.set(path, { container, key, node });
        return node;
    }

    // Points each listed place at the first one's object, as the file had it
    link(refs: Record<string, string[]>): void {
        for (const from of Object.keys(refs)) {
            const target = this.places.get(from);
            if (!target || !Array.isArray(refs[from])) continue;
            for (const to of refs[from]) {
                const place = this.places.get(to);
                if (place) place.container[place.key] = target.node;
            }
        }
    }
}

// Typed JSON to the readers' output, ready for SolTree.obj2Tree
export function importTypedJSON(o: TypedJSON): TypedImport {
    const info = o.meta.minerva || ({} as NonNullable<TypedJSON['meta']['minerva']>);
    const amfVersion = info.amfVersion === 0 ? 0 : 3;
    const importer = new Importer(amfVersion, o.meta.values || {});
    const body: Record<string, any> = {};
    for (const key of Object.keys(o.json)) body[key] = importer.place(body, key, o.json[key], joinPath('', key));
    if (o.meta.referentialEqualities) importer.link(o.meta.referentialEqualities);
    return { amfVersion, fileName: info.fileName, filePath: info.filePath, body };
}
