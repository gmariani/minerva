// Shapes shared by the tree, the views and the save/export code.

// What the AMF readers record about a value, plus flags the editor adds (can*, origType, ...).
// Readers add type-specific fields (class, members, weakKeys, nanBytes, ...), hence the index signature.
export interface Traits {
    type: string;
    origType?: string;
    class?: string;
    members?: string[];
    count?: number;
    dynamic?: boolean;
    externalizable?: boolean;
    fixed?: boolean;
    weakKeys?: boolean;
    canCreate?: boolean;
    canRename?: boolean;
    canDelete?: boolean;
    canEdit?: boolean;
    canBeIndexed?: boolean;
    isIndexed?: boolean;
    fixedLength?: boolean;
    [key: string]: unknown;
}

export interface NodeData {
    __traits: Traits;
    // The value's shape depends on the type: a primitive, a Date, a byte array, or for the root
    // node the SOL header
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    // Root node only: the Flex file path tag, if the file has one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value2?: any;
    // Copies of an object the file stored once share an originId (see sol/tree.ts)
    originId?: number;
    // Reference nodes: path of the object they point back to
    path?: string;
}

// A node as produced by SolTree.obj2Tree / createNode, before the store adds ids and parents
export interface NodeJSON {
    text: string;
    icon: string;
    title?: string;
    open?: boolean;
    data: NodeData | null;
    children?: NodeJSON[];
}

export interface TreeNode extends NodeJSON {
    id: string;
    parent: TreeNode | null;
    children?: TreeNode[];
}

// The File (or file-like info for new/imported files) the tree came from
export interface FileInfo {
    name: string;
    size: number | '?';
    lastModified?: number;
}
