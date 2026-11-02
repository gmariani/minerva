// window.minerva: a console API for scripting the editor. Run minerva.help() in the browser console.
/* eslint-disable @typescript-eslint/no-explicit-any -- values come from user scripts */
import type { TreeStore } from './model/TreeStore';
import type { SolTree } from './sol/tree';
import type { FileInfo, TreeNode } from './types';
import { exportNode, formatObject, getDataType } from './model/convert';
import { can, setNodeValue } from './model/actions';
import type { TypedJSON } from './model/typedJSON';

export interface ConsoleAPIDeps {
    store: TreeStore;
    getSol: () => SolTree | null;
    getFile: () => FileInfo | null;
    // Loads JSON (plain or typed) as a new file; returns an error message
    importJSON: (data: object, name: string) => string | null;
    exportJSON: (types: boolean) => Record<string, any> | TypedJSON;
    // Rejects if the file can't be read
    open: (buffer: ArrayBuffer, name: string) => Promise<void>;
    save: (download: boolean) => Promise<ArrayBuffer>;
}

type Path = string | Array<string | number>;

const HELP = `minerva console API

Paths are the labels shown in the sidebar joined with ".", e.g. "player.stats.hp" (write "\\." for a
dot inside a name and "\\\\" for a backslash), or an array of labels: ["player", "stats", "hp"].
"" or [] is the file itself. Dictionary entries are "Item 1", "Item 2", ... with "Key" and "Value" inside.

  minerva.file                      the open file's name and size, or null
  minerva.get(path?)                a value as plain JavaScript (objects and arrays included)
  minerva.type(path)                a value's type, e.g. "Integer", "Object", "Vector"
  minerva.keys(path?)               the labels of a value's children
  minerva.has(path)                 whether a value exists
  minerva.set(path, value, type?)   change a value, or add it if it doesn't exist. type forces one of
                                    Integer, Number, Boolean, String, XML, Date, Null, Undefined;
                                    otherwise it's kept (existing values) or guessed (new ones)
  minerva.remove(path)              delete a value
  minerva.select(path)              show a value in the editor
  minerva.toJSON({ types })         the file as JSON, as Export saves it (types: false for plain JSON)
  minerva.fromJSON(json, name?)     load JSON (plain or typed, object or string) as a new file
  await minerva.open(data, name?)   open a .sol file from an ArrayBuffer, typed array or Blob
  await minerva.save({ download })  the saved .sol file as an ArrayBuffer; download: true also saves it

Example: give every item in "inventory" a count of 99
  for (const k of minerva.keys('inventory')) minerva.set(['inventory', k, 'count'], 99)`;

// "a.b\.c" -> ["a", "b.c"]
function parsePath(path: Path): string[] {
    if (Array.isArray(path)) return path.map(String);
    if (path === '') return [];
    const parts: string[] = [];
    let part = '';
    for (let i = 0; i < path.length; i++) {
        const c = path[i];
        if (c === '\\' && i + 1 < path.length) part += path[++i];
        else if (c === '.') {
            parts.push(part);
            part = '';
        } else part += c;
    }
    parts.push(part);
    return parts;
}

const VALUE_TYPES = ['Integer', 'Number', 'Boolean', 'String', 'XML', 'Date', 'Null', 'Undefined'];
// Types the editor changes in place
const EDITABLE = ['Integer', 'Number', 'Boolean', 'String', 'XML', 'Date'];

function xmlError(value: string): string | null {
    const error = new DOMParser().parseFromString(value, 'text/xml').getElementsByTagName('parsererror')[0];
    return error ? error.textContent : null;
}

// Converts a script's value for a value type, or throws
function convert(value: any, type: string): any {
    switch (type) {
        case 'Integer':
        case 'Number': {
            const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
            if (typeof n !== 'number' || (isNaN(n) && typeof value === 'string' && value.trim() !== 'NaN'))
                throw new TypeError(JSON.stringify(value) + ' is not a number');
            if (type === 'Integer' && n % 1 !== 0) throw new TypeError(value + ' is not a whole number');
            return n;
        }
        case 'Boolean':
            return !!value;
        case 'String':
            return String(value);
        case 'XML': {
            const err = xmlError(String(value));
            if (err) throw new TypeError('Invalid XML: ' + err);
            return String(value);
        }
        case 'Date': {
            const d = new Date(value);
            if (isNaN(d.getTime())) throw new TypeError(JSON.stringify(value) + ' is not a date');
            return d;
        }
        default:
            return null;
    }
}

export function createConsoleAPI(deps: ConsoleAPIDeps) {
    const { store } = deps;

    const root = (): TreeNode => {
        if (!store.root?.data) throw new Error('No file is open');
        return store.root;
    };

    const find = (path: Path): TreeNode | undefined => {
        let node: TreeNode | undefined = root();
        for (const label of parsePath(path)) {
            node = node.children?.find((c) => c.text === label);
            if (!node) return undefined;
        }
        return node;
    };

    const need = (path: Path): TreeNode => {
        const node = find(path);
        if (!node) throw new Error('Nothing at ' + JSON.stringify(path));
        return node;
    };

    // Adds a child the way the Create window does
    const create = (parent: TreeNode, label: string, value: any, type?: string): TreeNode => {
        const sol = deps.getSol()!;
        const traits = parent.data!.__traits;
        if (traits.type === 'Dictionary') throw new Error('Add dictionary entries in the editor');
        if (!can.create(parent) || traits.fixed) throw new Error("Can't add to " + parent.text);
        const length = parent.children?.length ?? 0;
        if (traits.type === 'Vector' && label !== String(length)) throw new Error('Vectors can only be added to at the end (index ' + length + ')');

        let node: any;
        let valueType: string;
        if (type) {
            const v = convert(value, type);
            valueType = type === 'Boolean' && sol.amfVersion === 3 ? (v ? 'True' : 'False') : type;
            node = { __traits: { type: valueType }, value: v };
        } else {
            valueType = getDataType(value, sol.amfVersion);
            node = formatObject(value, sol.amfVersion);
        }
        const json = sol.createNode(traits.type, length, traits.class, label, node, valueType);
        if (typeof json === 'string') throw new Error(json);
        return store.create(parent, json);
    };

    const api = {
        help() {
            console.log(HELP);
        },

        get file() {
            const f = deps.getFile();
            return f && { name: f.name, size: f.size };
        },

        get(path: Path = ''): any {
            const node = need(path);
            if (node === store.root) return deps.exportJSON(false);
            return exportNode(node);
        },

        type(path: Path): string {
            return need(path).data!.__traits.type;
        },

        keys(path: Path = ''): string[] {
            return (need(path).children || []).map((c) => c.text);
        },

        has(path: Path): boolean {
            return !!find(path);
        },

        set(path: Path, value: any, type?: string): void {
            if (type !== undefined && !VALUE_TYPES.includes(type)) throw new Error('type must be one of ' + VALUE_TYPES.join(', '));
            const labels = parsePath(path);
            if (!labels.length) throw new Error("Can't replace the file itself; use fromJSON");
            const label = labels[labels.length - 1];
            const parent = need(labels.slice(0, -1));
            const node = parent.children?.find((c) => c.text === label);

            if (node) {
                const current = node.data!.__traits.type;
                const target = type ?? current;
                const isPrimitive = value === null || value instanceof Date || typeof value !== 'object';
                const isNumber = (t: string) => t === 'Integer' || t === 'Number';
                // The same kind of value is changed in place, which keeps its position
                if (isPrimitive && (target === current || (isNumber(target) && isNumber(current))) && EDITABLE.includes(current)) {
                    if (!can.edit(node)) throw new Error("Can't edit " + label);
                    // Without a type, Integers and Numbers follow the value as they do in the editor
                    const v = convert(value, isNumber(current) && type === undefined ? 'Number' : target);
                    setNodeValue(node, current === 'Boolean' ? (v ? 1 : 0) : v);
                    if (type && isNumber(type)) {
                        node.data!.__traits.type = type;
                        node.icon = type.toLowerCase();
                    }
                    store.touch();
                    return;
                }
                // Anything else replaces the value
                if (!can.remove(node)) throw new Error("Can't replace " + label + ' (its class declares it)');
                store.remove(node);
            }
            create(parent, label, value, type);
        },

        remove(path: Path): void {
            const node = need(path);
            if (!can.remove(node)) throw new Error("Can't remove " + node.text);
            const parent = node.parent!;
            store.remove(node);
            store.renumber(parent);
        },

        select(path: Path): void {
            store.select(need(path));
        },

        toJSON({ types = true }: { types?: boolean } = {}) {
            root();
            return deps.exportJSON(types);
        },

        fromJSON(json: object | string, name = 'Imported'): void {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            const error = deps.importJSON(data, name);
            if (error) throw new Error(error);
        },

        async open(data: ArrayBuffer | ArrayBufferView | Blob, name = 'file.sol'): Promise<void> {
            let buffer: ArrayBuffer;
            if (data instanceof Blob) buffer = await data.arrayBuffer();
            else if (ArrayBuffer.isView(data)) buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice().buffer;
            else buffer = data;
            await deps.open(buffer, name);
        },

        async save({ download = false }: { download?: boolean } = {}): Promise<ArrayBuffer> {
            root();
            return deps.save(download);
        },
    };
    return api;
}

export type ConsoleAPI = ReturnType<typeof createConsoleAPI>;

declare global {
    interface Window {
        minerva?: ConsoleAPI;
    }
}
