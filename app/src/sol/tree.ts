// Converts parsed SOL data (from SOLReaderWorker) into editor tree nodes, and builds new nodes.
/* eslint-disable @typescript-eslint/no-explicit-any -- the AMF readers' output is untyped */
import type { NodeJSON, Traits } from '../types';

/*
Node format (there are no required fields):
{
    text        : string   // node label (raw text, React escapes it)
    icon        : string   // CSS class for the type icon
    title       : string   // tooltip
    open        : boolean
    children    : []
    data        : { __traits, value, originId? }
}
*/

export interface ParsedSOL {
    header: any;
    body: Record<string, any>;
    flex?: any;
    fileName: string;
    fileSize: number | '?';
}

function normalizeType(type: string): string {
    switch (type.toLowerCase()) {
        case 'longstring':
            return 'String';
        case 'xml':
        case 'xmldocument':
            return 'XML';
        case 'double':
            return 'Number';
        case 'true':
        case 'false':
            return 'Boolean';
        case 'ecmaarray':
            return 'Array';
    }
    // Vector.<int>, Vector.<uint>, Vector.<Number>, Vector.<Object> and typed vectors
    if (type.toLowerCase().indexOf('vector') == 0) return 'Vector';
    return type;
}

// Types that live in the AMF object reference table and so can be shared
function isReferenceable(type: string): boolean {
    switch (type) {
        case 'Object':
        case 'Array':
        case 'ECMAArray':
        case 'Dictionary':
        case 'Date':
        case 'XML':
        case 'XMLDocument':
        case 'ByteArray':
            return true;
    }
    return type.indexOf('Vector') === 0;
}

function validateData(value: any, type: string): any {
    if (type == 'Number') value = Number(value);
    if (type == 'Integer') value = parseInt(value);
    if (type == 'String') value = String(value);
    return value;
}

interface Origin {
    id: number;
    path: string;
}

export class SolTree {
    amfVersion: number | '?' = '?';

    // An object the file stores once and references from several places becomes an independent
    // copy at each place, tagged with an originId so unedited copies can be written as a
    // reference again (see buildSOLBody in model/convert.ts). Only an object that contains
    // itself can't be copied, so that becomes a Reference node.
    private origins: Map<any, Origin> | null = null; // reader object -> first occurrence
    private ancestors: Set<any> | null = null; // reader objects being expanded, to detect cycles
    private nextOriginId = 0;

    private getReference(label: string, origin: Origin): NodeJSON {
        return {
            text: label,
            icon: 'reference',
            title: 'Reference to ' + origin.path,
            data: {
                __traits: { type: 'Reference', canCreate: false, canEdit: false },
                value: origin.id,
                path: origin.path,
            },
        };
    }

    private getChild(label: string, data: any, count?: number | string, parentPath?: string): NodeJSON {
        let val = data.value;
        const type: string = data.__traits.type;
        let valClass: string | undefined;
        const path = parentPath ? parentPath + ' › ' + label : label;
        let origin: Origin | undefined;
        let text: string;

        if (this.origins && this.ancestors && isReferenceable(type)) {
            origin = this.origins.get(data);
            if (origin && this.ancestors.has(data)) return this.getReference(label, origin);
            if (!origin) {
                origin = { id: this.nextOriginId++, path: path };
                this.origins.set(data, origin);
            }
            this.ancestors.add(data);
        }

        if (type == 'DictionaryItem') {
            val = { Key: data.key, Value: data.value };
            text = 'Item ' + count;
            if (data.key.__traits.type == 'Object') valClass = data.key.__traits.class || 'Object';
        } else {
            text = label;
            if (type == 'Object') valClass = data.__traits.class || 'Object';
        }

        // Standardize the AS3 data types to JavaScript data types
        const normalType = normalizeType(type);

        // Icon is the data type, all vector types share one
        let icon = type ? type.toLowerCase() : 'error';
        if (icon.indexOf('vector') != -1) icon = 'vector';

        const o: NodeJSON = { text, icon, data: null };

        // If complex object, populate children
        if ((type == 'Object' || type == 'ECMAArray' || type == 'Array' || type.indexOf('Vector') === 0 || type == 'Dictionary' || type == 'DictionaryItem') && val) {
            o.children = this.getChildren(val, type, path, type == 'Object' ? data.__traits.members : null);
        }

        // Tooltip is the data type, plus the class for objects
        o.title = type;
        if (type == 'Object') o.title += ' : ' + valClass;

        // Keep what the reader recorded (e.g. Dictionary weakKeys, Date timezone) so it's written back.
        // Copied per node: the reader shares one traits object between all objects of a class.
        const traits: Traits = Object.assign({}, data.__traits);

        if (type == 'Object') {
            traits.class = valClass;
            traits.canRename = true;
            val = {};
        }

        // Vector is an indexed only type
        if (normalType == 'Vector') {
            traits.canBeIndexed = true;
            val = [];
        }

        // Pass the entire object
        if (type == 'DictionaryItem') {
            val = data;
            o.icon = data.value.__traits.type ? data.value.__traits.type.toLowerCase() : 'error';
            o.title = 'Key: ' + data.key.__traits.type + ' | Value: ' + data.value.__traits.type;
            traits.canRename = false;
            traits.canCreate = false;
        }

        if (type == 'Dictionary') traits.canBeIndexed = true;

        // Prevent basic data types from containing children
        switch (type) {
            case 'Date':
            case 'String':
            case 'LongString':
            case 'ByteArray':
            case 'XML':
            case 'XMLDocument':
            case 'Null':
            case 'Undefined':
            case 'Boolean':
            case 'True':
            case 'False':
            case 'Integer':
            case 'Number':
                traits.canCreate = false;
        }

        // Maintain original type
        switch (type) {
            case 'LongString':
            case 'Double':
            case 'XMLDocument':
            case 'True':
            case 'False':
            case 'ECMAArray':
            case 'Vector.<int>':
            case 'Vector.<uint>':
            case 'Vector.<Number>':
                traits.origType = type;
                break;
            default:
                if (type.indexOf('Vector.<') != -1) traits.origType = 'Vector.<Object>';
                break;
        }

        traits.type = normalType;
        o.data = { __traits: traits, value: val };
        if (origin) {
            o.data.originId = origin.id;
            this.ancestors!.delete(data);
        }
        return o;
    }

    private getChildren(obj: any, parType: string, path: string | undefined, sealedMembers: string[] | null): NodeJSON[] {
        const children: NodeJSON[] = [];
        let count = 1;
        for (const prop in obj) {
            const o = this.getChild(prop, obj[prop], count++, path);
            const traits = o.data!.__traits;
            // Since these items have special name or indices, they cannot be renamed
            if (parType.indexOf('Vector') === 0 || parType == 'DictionaryItem') traits.canRename = false;
            if (parType == 'Array' || parType == 'ECMAArray') traits.canRename = true;
            // Members declared by the class always exist in AS3, so they can't be removed or renamed
            if (sealedMembers && sealedMembers.indexOf(prop) != -1) {
                traits.canRename = false;
                traits.canDelete = false;
            }
            // DictionaryItem is not a real type and cannot contain any more children
            // Can't edit the dictionary item children since they don't really exist in AS3
            if (parType == 'DictionaryItem') {
                traits.canCreate = false;
                traits.canRename = false;
                traits.canDelete = false;
                traits.canEdit = false;
            }
            children.push(o);
        }
        return children;
    }

    obj2Tree(data: ParsedSOL): NodeJSON {
        this.amfVersion = data.header.amfVersion;
        this.origins = new Map();
        this.ancestors = new Set();
        this.nextOriginId = 0;

        const json: NodeJSON = {
            text: data.fileName,
            icon: 'localsharedobject',
            children: this.getChildren(data.body, 'lso', undefined, null),
            open: true,
            data: {
                __traits: {
                    type: 'localsharedobject',
                    canCreate: true,
                    canRename: false,
                    canDelete: false,
                    canEdit: false,
                },
                value: data.header,
                value2: data.flex,
            },
            title: data.header.fileName + ' : AMF' + data.header.amfVersion,
        };
        this.origins = this.ancestors = null;
        return json;
    }

    // Builds a node to add under a parent, or returns an error message
    createNode(parentType: string | null, parentLength: number, parentClass: string | undefined, label: string | null, value: any, valueType: string | null): NodeJSON | string {
        const indexLabel = String(parentLength);
        if (label == null) label = 'New String';
        if (value == null) value = 'Hello World';
        if (valueType == null) valueType = 'String';
        if (parentType == null) parentType = '';

        switch (parentType.toLowerCase()) {
            case 'object':
            case 'localsharedobject': // Root
            case 'array': // Arrays can act like objects so don't restrict label
                value.value = validateData(value.value, valueType);
                return this.getChild(label, value);
            case 'vector':
                switch (parentClass) {
                    case 'Number':
                        value.value = validateData(value.value, 'Number');
                        return this.getChild(indexLabel, value);
                    case 'int':
                    case 'uint':
                        value.value = validateData(value.value, 'Integer');
                        return this.getChild(indexLabel, value);
                    case 'Object':
                        value.value = validateData(value.value, valueType);
                        return this.getChild(indexLabel, value);
                    default:
                        // Typed Object
                        return this.getChild(indexLabel, {
                            value: {},
                            __traits: { type: 'Object', class: parentClass, members: [], count: 0, externalizable: false, dynamic: true },
                        });
                }
            case 'dictionary':
                return this.getChild(indexLabel, value, String(parentLength + 1));
            default:
                return 'Can only add new items to objects or at the root level';
        }
    }
}
