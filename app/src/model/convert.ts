// Converts between the editor tree and the SOL writer's input, JSON export, and JSON import
/* eslint-disable @typescript-eslint/no-explicit-any -- builds untyped AMF node structures */
import type { NodeJSON } from '../types';

///////////////////////
// Tree -> SOL write //
///////////////////////

// Gives every distinct node content a number, so copies can be compared without
// re-serializing their whole subtree at each level. Editor-only flags are ignored.
const EDITOR_KEYS: Record<string, 1> = { canCreate: 1, canRename: 1, canDelete: 1, canEdit: 1, canBeIndexed: 1, originId: 1, path: 1 };

function isNode(v: any): boolean {
    return v !== null && typeof v === 'object' && '__traits' in v;
}

class SOLBuilder {
    // Copies of each shared object built so far, by originId (see SolTree.obj2Tree)
    private copiesByOrigin = new Map<number, Map<number, any>>();
    // Reference nodes (an object containing itself) waiting for their target to be built
    private pendingRefs: Array<{ container: any; key: string; originId: number; label: string; path?: string }> = [];
    private formIds = new WeakMap<object, number>();
    private forms = new Map<string, number>();

    private formOf(node: any): number {
        let id = this.formIds.get(node);
        if (id !== undefined) return id;

        const traits = JSON.stringify(node.__traits, (key, value) => (EDITOR_KEYS[key] ? undefined : value));
        const value = node.value;
        let content: string;
        if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
            const parts = [Array.isArray(value) ? '[' : '{'];
            for (const key in value) {
                const v = value[key];
                parts.push(JSON.stringify(key) + ':' + (isNode(v) ? '#' + this.formOf(v) : JSON.stringify(v)));
            }
            content = parts.join(',');
        } else {
            content = JSON.stringify(value);
        }

        const form = traits + '|' + content;
        id = this.forms.get(form);
        if (id === undefined) this.forms.set(form, (id = this.forms.size));
        this.formIds.set(node, id);
        return id;
    }

    // A file stores a shared object once and references it from its other places. Copies that
    // came from the same object and haven't been edited apart are made the same object again,
    // which the writer then emits as a reference; edited copies are written separately.
    private shareIfUnchanged(originId: number, node: any): any {
        let copies = this.copiesByOrigin.get(originId);
        if (!copies) this.copiesByOrigin.set(originId, (copies = new Map()));
        const form = this.formOf(node);
        if (copies.has(form)) return copies.get(form);
        copies.set(form, node);
        return node;
    }

    private build(o: any, children: NodeJSON[] | undefined): any {
        for (const child of children || []) {
            const data = child.data!;
            const type = data.__traits.type;
            const key = child.text;

            switch (type) {
                case 'Integer':
                case 'Number':
                case 'Boolean':
                case 'String':
                case 'ByteArray':
                case 'XML':
                case 'Date':
                case 'Null':
                case 'Undefined':
                    o[key] = data;
                    break;
                case 'Reference':
                    // Filled in once every target has been built
                    o[key] = null;
                    this.pendingRefs.push({ container: o, key, originId: data.value, label: child.text, path: data.path });
                    break;
                case 'Vector':
                case 'Dictionary':
                case 'Array':
                    o[key] = { __traits: data.__traits, value: this.build(data.__traits.origType === 'ECMAArray' ? {} : [], child.children) };
                    break;
                case 'Object':
                    o[key] = { __traits: data.__traits, value: this.build({}, child.children) };
                    break;
                case 'DictionaryItem':
                    o[o.length] = {
                        __traits: data.__traits,
                        value: this.build({}, [
                            { ...child.children![0], text: 'Key' },
                            { ...child.children![1], text: 'Value' },
                        ]),
                    };
                    break;
            }

            if (data.originId != null && type !== 'DictionaryItem') {
                o[key] = this.shareIfUnchanged(data.originId, o[key]);
            }
        }
        return o;
    }

    buildBody(children: NodeJSON[] | undefined): Record<string, any> {
        const body = this.build({}, children);

        // A Reference node points back at the object that contains it
        for (const ref of this.pendingRefs) {
            const copies = this.copiesByOrigin.get(ref.originId);
            const target = copies && copies.values().next().value;
            if (!target) throw new Error('"' + ref.label + '" is a reference to ' + ref.path + ', which was deleted.');
            ref.container[ref.key] = target;
        }
        return body;
    }
}

// Converts the tree to the structure the SOL writer expects
export function buildSOLBody(children: NodeJSON[] | undefined): Record<string, any> {
    return new SOLBuilder().buildBody(children);
}

/////////////////////
// Tree -> JSON    //
/////////////////////

function exportNode(node: NodeJSON): any {
    const data = node.data!;
    const value = data.value;
    switch (data.__traits.type) {
        case 'Boolean':
            return value ? true : false;
        case 'ByteArray':
            return Array.from(value as ArrayLike<number>);
        case 'Integer':
        case 'Number':
        case 'String':
        case 'XML':
        case 'Date':
        case 'Null':
        case 'Undefined':
            return value;
        case 'Reference':
            // An object containing itself can't be written as JSON
            return '[Circular: ' + data.path + ']';
        case 'Dictionary':
            return (node.children || []).map(exportNode);
        case 'DictionaryItem':
            return { Key: exportNode(node.children![0]), Value: exportNode(node.children![1]) };
        case 'Array':
        case 'Vector': {
            // A plain list exports as a JSON array; one with named entries (ECMA array) as an object
            const children = node.children || [];
            if (children.every((c, i) => c.text === String(i))) return children.map(exportNode);
            return exportChildren(children);
        }
        default:
            return exportChildren(node.children || []);
    }
}

function exportChildren(children: NodeJSON[]): Record<string, any> {
    const o: Record<string, any> = {};
    for (const child of children) o[child.text] = exportNode(child);
    return o;
}

// The root node's variables as plain JSON
export function treeToJSON(root: NodeJSON): Record<string, any> {
    return exportChildren(root.children || []);
}

/////////////////////
// JSON -> nodes   //
/////////////////////

// Guesses the AMF type of a value typed or imported by the user
export function getDataType(val: any, amfVersion: number | '?'): string {
    let type: string = typeof val;
    if (val === null) {
        type = 'Null';
    } else {
        switch (typeof val) {
            case 'boolean':
                type = amfVersion === 3 ? (val ? 'True' : 'False') : 'Boolean';
                break;
            case 'number':
                type = 'Number';
                break;
            case 'string':
                type = 'String';
                break;
            case 'object':
                type = 'Object';
                break;
        }
    }

    // Is XML? (DOMParser reports non-XML as a parsererror document)
    if (type === 'String') {
        const dom = new DOMParser().parseFromString(val, 'text/xml');
        if (dom.getElementsByTagName('parsererror').length === 0) type = 'XML';
    }
    if (type === 'Number' && val % 1 === 0 && amfVersion === 3) type = 'Integer';
    if (type === 'Object' && Array.isArray(val)) type = 'Array';
    if (type === 'Object' && val instanceof Date) type = 'Date';

    return type;
}

export function formatChildren(o: any, amfVersion: number | '?'): Record<string, any> {
    const obj: Record<string, any> = {};
    for (const prop in o) obj[prop] = formatObject(o[prop], amfVersion);
    return obj;
}

// Wraps a plain value in the { __traits, value } form the readers produce
export function formatObject(val: any, amfVersion: number | '?'): any {
    const type = getDataType(val && val.value ? val.value : val, amfVersion);
    if (type === 'Object') {
        const traits =
            amfVersion === 3 ? { type, class: type, members: [], count: 0, externalizable: false, dynamic: true } : { type };
        return { __traits: traits, value: formatChildren(val, amfVersion) };
    }
    if (type === 'Array') return { __traits: { type }, value: formatChildren(val, amfVersion) };
    return { __traits: { type }, value: val };
}
