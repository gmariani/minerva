import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';
import type { TreeStore, Row } from '../../model/TreeStore';
import type { TreeNode } from '../../types';
import { copyNode, cutNode, pasteNode, removeNodes, startRename } from '../../model/actions';

const ROW_HEIGHT = 24;
// Rows rendered beyond the visible area, so fast scrolling doesn't show blanks
const OVERSCAN = 20;

interface TreeProps {
    store: TreeStore;
    // The element that scrolls the tree (the sidebar)
    scrollRef: RefObject<HTMLElement | null>;
    onContextMenu: (node: TreeNode, x: number, y: number) => void;
}

export function Tree({ store, scrollRef, onContextMenu }: TreeProps) {
    const rows = store.rows();
    const containerRef = useRef<HTMLDivElement>(null);
    const [range, setRange] = useState({ start: 0, end: 60 });

    // Work out which rows are on screen from the sidebar's scroll position
    useLayoutEffect(() => {
        const scroller = scrollRef.current;
        const container = containerRef.current;
        if (!scroller || !container) return;
        const update = () => {
            const top = scroller.scrollTop - (container.offsetTop - scroller.offsetTop);
            const start = Math.max(0, Math.floor(top / ROW_HEIGHT) - OVERSCAN);
            const end = Math.ceil((top + scroller.clientHeight) / ROW_HEIGHT) + OVERSCAN;
            setRange((r) => (r.start === start && r.end === end ? r : { start, end }));
        };
        update();
        scroller.addEventListener('scroll', update, { passive: true });
        const resize = new ResizeObserver(update);
        resize.observe(scroller);
        return () => {
            scroller.removeEventListener('scroll', update);
            resize.disconnect();
        };
    }, [scrollRef]);

    // Keep the focused row in view when it's moved with the keyboard
    const scrollToNode = (node: TreeNode) => {
        const scroller = scrollRef.current;
        const container = containerRef.current;
        const index = store.rows().findIndex((r) => r.node === node);
        if (!scroller || !container || index === -1) return;
        const rowTop = container.offsetTop - scroller.offsetTop + index * ROW_HEIGHT;
        if (rowTop < scroller.scrollTop) scroller.scrollTop = rowTop;
        else if (rowTop + ROW_HEIGHT > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = rowTop + ROW_HEIGHT - scroller.clientHeight;
    };

    const focusRow = (node: TreeNode | undefined) => {
        if (!node) return;
        store.select(node);
        scrollToNode(node);
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        const node = store.focused;
        if (!node) {
            if (rows.length && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                focusRow(rows[0].node);
            }
            return;
        }
        const index = rows.findIndex((r) => r.node === node);
        const ctrl = e.ctrlKey || e.metaKey;
        switch (e.key) {
            case 'ArrowDown':
                focusRow(rows[index + 1]?.node);
                break;
            case 'ArrowUp':
                focusRow(rows[index - 1]?.node);
                break;
            case 'ArrowRight':
                if (node.children?.length && !node.open) store.setOpen(node, true);
                else if (node.open) focusRow(store.rows()[index + 1]?.node);
                break;
            case 'ArrowLeft':
                if (node.open && node.children?.length) store.setOpen(node, false);
                else if (node.parent) focusRow(node.parent);
                break;
            case 'Home':
                focusRow(rows[0]?.node);
                break;
            case 'End':
                focusRow(rows[rows.length - 1]?.node);
                break;
            case 'F2':
                startRename(store, node);
                break;
            case 'Delete':
                removeNodes(store, node);
                break;
            case 'x':
            case 'X':
                if (!ctrl) return;
                cutNode(store, node);
                break;
            case 'c':
            case 'C':
                if (!ctrl) return;
                copyNode(store, node);
                break;
            case 'v':
            case 'V':
                if (!ctrl) return;
                pasteNode(store, node);
                break;
            default:
                return;
        }
        e.preventDefault();
    };

    const onRowClick = (e: MouseEvent, node: TreeNode) => {
        containerRef.current?.focus({ preventScroll: true });
        store.select(node, e.shiftKey ? 'range' : e.ctrlKey || e.metaKey ? 'toggle' : 'replace');
    };

    const visible = rows.slice(range.start, range.end);
    return (
        <div ref={containerRef} id="jstree" className="tree jstree jstree-default" tabIndex={0} role="tree" onKeyDown={onKeyDown}>
            <div className="tree-rows jstree-striped" style={{ height: rows.length * ROW_HEIGHT }}>
                {visible.map((row, i) => (
                    <TreeRow
                        key={row.node.id}
                        row={row}
                        top={(range.start + i) * ROW_HEIGHT}
                        store={store}
                        onClick={onRowClick}
                        onContextMenu={(e, node) => {
                            e.preventDefault();
                            if (!store.selected.has(node.id)) store.select(node);
                            // Like jsTree, the menu opens below the node's label
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            onContextMenu(node, rect.left, rect.bottom);
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

interface TreeRowProps {
    row: Row;
    top: number;
    store: TreeStore;
    onClick: (e: MouseEvent, node: TreeNode) => void;
    onContextMenu: (e: MouseEvent, node: TreeNode) => void;
}

function TreeRow({ row, top, store, onClick, onContextMenu }: TreeRowProps) {
    const { node, guides, isLast } = row;
    const hasChildren = !!node.children?.length;
    const state = !hasChildren ? 'jstree-leaf' : node.open ? 'jstree-open' : 'jstree-closed';
    const anchorClass =
        'jstree-anchor' +
        (store.selected.has(node.id) ? ' jstree-clicked' : '') +
        (store.focusedId === node.id ? ' tree-focused' : '') +
        (store.isSearchMatch(node) ? ' jstree-search' : '');

    return (
        <div className="tree-row" style={{ top }} role="treeitem" aria-expanded={hasChildren ? !!node.open : undefined} aria-selected={store.selected.has(node.id)}>
            {guides.map((line, i) => (
                <span key={i} className={'tree-indent' + (line ? ' tree-line' : '')} />
            ))}
            <span className={'tree-ocl-cell ' + state + (isLast ? '' : ' tree-line')}>
                <i className="jstree-icon jstree-ocl" role="presentation" onClick={() => store.setOpen(node, !node.open)} />
            </span>
            {store.editingId === node.id ? (
                <RenameInput node={node} store={store} />
            ) : (
                <a
                    className={anchorClass}
                    href="#"
                    tabIndex={-1}
                    title={node.title}
                    onClick={(e) => {
                        e.preventDefault();
                        onClick(e, node);
                    }}
                    onDoubleClick={() => store.setOpen(node, !node.open)}
                    onContextMenu={(e) => onContextMenu(e, node)}
                >
                    <i className={'jstree-icon jstree-themeicon ' + node.icon + ' jstree-themeicon-custom'} role="presentation" />
                    {node.text}
                </a>
            )}
        </div>
    );
}

function RenameInput({ node, store }: { node: TreeNode; store: TreeStore }) {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        ref.current?.focus();
        ref.current?.select();
    }, []);
    const finish = (save: boolean) => {
        if (store.editingId !== node.id) return;
        const text = ref.current?.value ?? node.text;
        store.edit(null);
        if (save && text !== node.text) store.rename(node, text);
        document.getElementById('jstree')?.focus({ preventScroll: true });
    };
    return (
        <input
            ref={ref}
            className="tree-rename-input"
            defaultValue={node.text}
            onBlur={() => finish(true)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') finish(true);
                if (e.key === 'Escape') finish(false);
            }}
        />
    );
}
