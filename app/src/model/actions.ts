// Tree editing commands shared by the context menu and keyboard shortcuts
import type { NodeJSON, TreeNode } from '../types';
import type { TreeStore } from './TreeStore';

const CLIPBOARD_KEY = 'clipboard';

function readClipboard(): string | null {
    try {
        return localStorage.getItem(CLIPBOARD_KEY);
    } catch {
        return null;
    }
}

function writeClipboard(json: NodeJSON): void {
    try {
        localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(json));
    } catch {
        // Storage unavailable (private mode, quota): nothing to paste later
    }
}

// A pasted copy is a new object, so it mustn't be merged with the one it was copied from
function forgetOrigins(json: NodeJSON): NodeJSON {
    const copy: NodeJSON = { ...json, data: json.data && { ...json.data } };
    if (copy.data) delete copy.data.originId;
    if (json.children) copy.children = json.children.map(forgetOrigins);
    return copy;
}

export const can = {
    create: (node: TreeNode) => !!node.data && node.data.__traits.canCreate !== false,
    rename: (node: TreeNode) => !!node.data && node.data.__traits.canRename !== false,
    edit: (node: TreeNode) => !!node.data && node.data.__traits.canEdit !== false,
    // Fixed-length vectors can't lose or gain items
    remove: (node: TreeNode) =>
        !!node.data && node.data.__traits.canDelete !== false && !!node.parent && node.parent.data?.__traits.fixed !== true,
    paste: (node: TreeNode) => !!node.data && node.data.__traits.canCreate !== false && node.data.__traits.fixed !== true,
    hasClipboard: () => readClipboard() !== null,
};

export function removeNodes(store: TreeStore, node: TreeNode): void {
    // Acting on a selected node acts on the whole selection
    const targets = store.selected.has(node.id) ? store.selectedNodes() : [node];
    const parents = new Set<TreeNode>();
    for (const target of targets) {
        if (!can.remove(target)) continue;
        parents.add(target.parent!);
        store.remove(target);
    }
    parents.forEach((p) => store.renumber(p));
}

export function cutNode(store: TreeStore, node: TreeNode): void {
    if (!can.remove(node)) return;
    const parent = node.parent!;
    writeClipboard(store.toJSON(node));
    store.remove(node);
    store.renumber(parent);
}

export function copyNode(store: TreeStore, node: TreeNode): void {
    if (node.parent === null) return;
    writeClipboard(forgetOrigins(store.toJSON(node)));
}

export function pasteNode(store: TreeStore, target: TreeNode): void {
    const clipboard = readClipboard();
    if (!clipboard || !can.paste(target)) return;
    const created = store.create(target, JSON.parse(clipboard));
    store.renumber(target);
    store.select(created);
}

export function startRename(store: TreeStore, node: TreeNode): void {
    if (can.rename(node) && node.parent) store.edit(node);
}

const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

// Whole numbers in the 32-bit range are Integers, anything else is a Number
export function numberType(value: number): 'Integer' | 'Number' {
    return String(value).indexOf('.') > -1 || value < INT_MIN || value > INT_MAX ? 'Number' : 'Integer';
}

// Sets a value node's value, keeping its type, icon and tooltip in step. Call store.touch() afterwards.
export function setNodeValue(node: TreeNode, value: unknown): void {
    const traits = node.data!.__traits;
    // Integer/Number nodes switch type with the value
    if (traits.type === 'Integer' || traits.type === 'Number') {
        traits.type = numberType(value as number);
        node.icon = traits.type.toLowerCase();
    }
    // AMF3 stores booleans as separate True/False types
    if (traits.origType === 'False' || traits.origType === 'True') {
        traits.origType = value ? 'True' : 'False';
        node.icon = traits.origType.toLowerCase();
        node.title = traits.origType;
    }
    // Each node gets its own Date so they stay independent
    node.data!.value = value instanceof Date ? new Date(value) : value;
}
