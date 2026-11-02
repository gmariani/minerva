// The editor tree: nodes, open/selected state, search and sorting. Views mutate node.data
// directly (as they did with jsTree) and call touch() when the tree's display should update.
import type { NodeJSON, TreeNode } from '../types';

export interface Row {
    node: TreeNode;
    depth: number;
    // For each ancestor level, whether its connector line continues past this row
    guides: boolean[];
    isLast: boolean;
}

// Natural sort: "item2" before "item10"
export function naturalCompare(a: string, b: string): number {
    const chunk = (t: string) => t.match(/(\d+\.?\d*|\D+)/g) || [];
    const aa = chunk(a);
    const bb = chunk(b);
    for (let i = 0; i < aa.length && i < bb.length; i++) {
        if (aa[i] !== bb[i]) {
            const c = Number(aa[i]);
            const d = Number(bb[i]);
            if (!isNaN(c) && !isNaN(d)) return c - d;
            return aa[i] > bb[i] ? 1 : -1;
        }
    }
    return aa.length - bb.length;
}

export class TreeStore {
    root: TreeNode | null = null;
    version = 0;
    sortEnabled = false;
    selected = new Set<string>();
    // The node shown in the details pane and moved by the keyboard
    focusedId: string | null = null;
    // Where Shift-click ranges start: the last node clicked without Shift
    anchorId: string | null = null;
    editingId: string | null = null;

    private nodes = new Map<string, TreeNode>();
    private nextId = 1;
    private listeners = new Set<() => void>();
    private searchMatches: Set<string> | null = null;
    private searchVisible: Set<string> | null = null;
    private openedBySearch = new Set<string>();
    private rowsCache: { version: number; rows: Row[] } | null = null;

    subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getVersion = () => this.version;

    // Call after changing anything shown in the tree
    touch(): void {
        this.version++;
        this.listeners.forEach((l) => l());
    }

    get(id: string | null): TreeNode | undefined {
        return id ? this.nodes.get(id) : undefined;
    }

    get focused(): TreeNode | undefined {
        return this.get(this.focusedId);
    }

    private adopt(json: NodeJSON, parent: TreeNode | null): TreeNode {
        const node = json as TreeNode;
        node.id = 'n' + this.nextId++;
        node.parent = parent;
        this.nodes.set(node.id, node);
        if (json.children) {
            for (const child of json.children) this.adopt(child, node);
            if (this.sortEnabled) this.sortChildren(node);
        }
        return node;
    }

    load(json: NodeJSON | null, sortEnabled: boolean): void {
        this.nodes.clear();
        this.selected.clear();
        this.focusedId = this.anchorId = this.editingId = null;
        this.searchMatches = this.searchVisible = null;
        this.openedBySearch.clear();
        this.sortEnabled = sortEnabled;
        this.root = json ? this.adopt(json, null) : null;
        this.touch();
    }

    private sortChildren(node: TreeNode): void {
        node.children?.sort((a, b) => naturalCompare(a.text, b.text));
    }

    ///////////////
    // Structure //
    ///////////////

    // Adds a node (and its subtree) as the last child of parent
    create(parent: TreeNode, json: NodeJSON): TreeNode {
        const node = this.adopt(json, parent);
        (parent.children ||= []).push(node);
        if (this.sortEnabled) this.sortChildren(parent);
        parent.open = true;
        this.touch();
        return node;
    }

    remove(node: TreeNode): void {
        const parent = node.parent;
        if (!parent?.children) return;
        parent.children.splice(parent.children.indexOf(node), 1);
        const forget = (n: TreeNode) => {
            this.nodes.delete(n.id);
            this.selected.delete(n.id);
            if (this.focusedId === n.id) this.focusedId = null;
            if (this.anchorId === n.id) this.anchorId = null;
            n.children?.forEach(forget);
        };
        forget(node);
        this.touch();
    }

    rename(node: TreeNode, text: string): void {
        node.text = text;
        if (this.sortEnabled && node.parent) this.sortChildren(node.parent);
        this.touch();
    }

    // Indexed containers (arrays, vectors, dictionaries) label their children by position
    renumber(parent: TreeNode): void {
        if (!parent.data?.__traits.canBeIndexed) return;
        parent.children?.forEach((child, i) => {
            child.text = parent.data!.__traits.type === 'Dictionary' ? 'Item ' + (i + 1) : String(i);
        });
        this.touch();
    }

    // A plain copy of a subtree, without ids or parent links (for the clipboard, save and export)
    toJSON(node: TreeNode): NodeJSON {
        const json: NodeJSON = { text: node.text, icon: node.icon, title: node.title, data: node.data };
        if (node.children) json.children = node.children.map((c) => this.toJSON(c));
        return json;
    }

    ////////////////////////
    // Open and selection //
    ////////////////////////

    setOpen(node: TreeNode, open: boolean): void {
        if (!node.children?.length || !!node.open === open) return;
        node.open = open;
        this.touch();
    }

    select(node: TreeNode, mode: 'replace' | 'toggle' | 'range' = 'replace'): void {
        if (mode === 'replace') {
            this.selected = new Set([node.id]);
        } else if (mode === 'toggle') {
            if (this.selected.has(node.id)) this.selected.delete(node.id);
            else this.selected.add(node.id);
        } else {
            const rows = this.rows();
            const from = rows.findIndex((r) => r.node.id === (this.anchorId ?? this.focusedId));
            const to = rows.findIndex((r) => r.node === node);
            if (from === -1) {
                this.selected = new Set([node.id]);
                this.anchorId = node.id;
            } else {
                const [a, b] = from < to ? [from, to] : [to, from];
                this.selected = new Set(rows.slice(a, b + 1).map((r) => r.node.id));
            }
        }
        if (mode !== 'range') this.anchorId = node.id;
        this.focusedId = node.id;
        // Opening ancestors makes sure the selection is visible
        for (let p = node.parent; p; p = p.parent) p.open = true;
        this.touch();
    }

    selectedNodes(): TreeNode[] {
        return [...this.selected].map((id) => this.nodes.get(id)!).filter(Boolean);
    }

    edit(node: TreeNode | null): void {
        this.editingId = node ? node.id : null;
        this.touch();
    }

    ////////////
    // Search //
    ////////////

    // Shows only nodes whose label or value contains str (case-insensitive) and their ancestors
    search(str: string): void {
        // Close what the previous search opened
        this.openedBySearch.forEach((id) => {
            const n = this.nodes.get(id);
            if (n) n.open = false;
        });
        this.openedBySearch.clear();

        str = str.toLowerCase();
        if (!str || !this.root) {
            this.searchMatches = this.searchVisible = null;
            this.touch();
            return;
        }

        const matches = new Set<string>();
        const visible = new Set<string>();
        const stack: TreeNode[] = [this.root];
        while (stack.length) {
            const node = stack.pop()!;
            if (node.children) stack.push(...node.children);
            if (!node.data || node === this.root) continue;
            const value = node.data.value;
            const valueText = value !== null && typeof value === 'object' && !(value instanceof Date) ? '' : String(value).toLowerCase();
            if (node.text.toLowerCase().indexOf(str) === -1 && valueText.indexOf(str) === -1) continue;
            matches.add(node.id);
            visible.add(node.id);
            for (let p = node.parent; p && !visible.has(p.id); p = p.parent) {
                visible.add(p.id);
                if (!p.open) {
                    p.open = true;
                    this.openedBySearch.add(p.id);
                }
            }
        }
        if (this.root) visible.add(this.root.id);
        this.searchMatches = matches;
        this.searchVisible = visible;
        this.touch();
    }

    isSearchMatch(node: TreeNode): boolean {
        return !!this.searchMatches?.has(node.id);
    }

    //////////
    // Rows //
    //////////

    // The visible nodes in display order, for the virtualized tree
    rows(): Row[] {
        if (this.rowsCache?.version === this.version) return this.rowsCache.rows;
        const rows: Row[] = [];
        const visible = this.searchVisible;
        const walk = (node: TreeNode, depth: number, guides: boolean[], isLast: boolean) => {
            rows.push({ node, depth, guides, isLast });
            if (!node.open || !node.children) return;
            const children = visible ? node.children.filter((c) => visible.has(c.id)) : node.children;
            const childGuides = [...guides, !isLast];
            children.forEach((child, i) => walk(child, depth + 1, childGuides, i === children.length - 1));
        };
        if (this.root) walk(this.root, 0, [], true);
        this.rowsCache = { version: this.version, rows };
        return rows;
    }
}
