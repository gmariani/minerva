import { useEffect, useRef, useState } from 'react';
import type { TreeNode } from '../../types';
import type { TreeStore } from '../../model/TreeStore';
import { can, copyNode, cutNode, pasteNode, removeNodes, startRename } from '../../model/actions';

interface MenuItem {
    label: string;
    disabled: boolean;
    separatorBefore?: boolean;
    action?: () => void;
    submenu?: MenuItem[];
}

interface ContextMenuProps {
    store: TreeStore;
    node: TreeNode;
    x: number;
    y: number;
    onCreate: (node: TreeNode) => void;
    onClose: () => void;
}

export function ContextMenu({ store, node, x, y, onCreate, onClose }: ContextMenuProps) {
    const ref = useRef<HTMLUListElement>(null);
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

    // Close on any click elsewhere, Escape, or scrolling
    useEffect(() => {
        const onPointer = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node)) onClose();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('pointerdown', onPointer, true);
        document.addEventListener('keydown', onKey);
        window.addEventListener('wheel', onClose, { passive: true });
        return () => {
            document.removeEventListener('pointerdown', onPointer, true);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('wheel', onClose);
        };
    }, [onClose]);

    const items: MenuItem[] = [
        { label: 'Create', disabled: !can.create(node), action: () => onCreate(node) },
        { label: 'Rename', disabled: !can.rename(node), separatorBefore: true, action: () => startRename(store, node) },
        { label: 'Delete', disabled: !can.remove(node), action: () => removeNodes(store, node) },
        {
            label: 'Edit',
            disabled: !can.edit(node),
            separatorBefore: true,
            submenu: [
                { label: 'Cut', disabled: false, action: () => cutNode(store, node) },
                { label: 'Copy', disabled: false, action: () => copyNode(store, node) },
                { label: 'Paste', disabled: !can.hasClipboard(), action: () => pasteNode(store, node) },
            ],
        },
    ];

    const renderItems = (list: MenuItem[]) =>
        list.flatMap((item) => [
            item.separatorBefore ? (
                <li key={item.label + '-sep'} className="vakata-context-separator">
                    <a href="#" onClick={(e) => e.preventDefault()}>
                        &#160;
                    </a>
                </li>
            ) : null,
            <li
                key={item.label}
                className={(item.disabled ? 'vakata-contextmenu-disabled' : '') + (openSubmenu === item.label ? ' vakata-context-hover' : '')}
                onMouseEnter={() => setOpenSubmenu(item.submenu ? item.label : null)}
            >
                <a
                    href="#"
                    className={item.submenu ? 'vakata-context-parent' : undefined}
                    onClick={(e) => {
                        e.preventDefault();
                        if (item.disabled || !item.action) return;
                        onClose();
                        item.action();
                    }}
                >
                    <i />
                    <span className="vakata-contextmenu-sep">&#160;</span>
                    {item.label}
                </a>
                {item.submenu && openSubmenu === item.label && (
                    // A disabled parent still shows its items, all disabled
                    <ul style={{ display: 'block' }}>{renderItems(item.disabled ? item.submenu.map((sub) => ({ ...sub, disabled: true })) : item.submenu)}</ul>
                )}
            </li>,
        ]);

    return (
        <ul ref={ref} className="vakata-context jstree-contextmenu jstree-default-contextmenu tree-menu" style={{ left: x, top: y }} role="menu">
            {renderItems(items)}
        </ul>
    );
}
