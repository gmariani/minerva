import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { TreeStore } from './model/TreeStore';
import { buildSOLBody, formatChildren, formatObject, getDataType, treeToJSON } from './model/convert';
import { SolTree, type ParsedSOL } from './sol/tree';
import { readSOL, writeSOL } from './sol/io';
import { getCookie, saveFile, setCookie } from './util';
import type { FileInfo, NodeJSON, TreeNode } from './types';
import { useAlert } from './components/Alert';
import { Overlay } from './components/Overlay';
import { AboutOverlay, FileTitle, Footer, Nav, SearchField } from './components/Chrome';
import { CreateWindow, ImportBinaryWindow, ImportJSONWindow, NewFileWindow, OpenFileWindow, SaveWindow, type CreateContext, type DialogName } from './components/Dialogs';
import { Tree } from './components/tree/Tree';
import { ContextMenu } from './components/tree/ContextMenu';
import { DetailsPane } from './components/details/DetailsPane';
import { numberType } from './components/details/ValueViews';

const SORT_COOKIE = 'enableSort';

export function App() {
    const showAlert = useAlert();
    const [store] = useState(() => new TreeStore());
    useSyncExternalStore(store.subscribe, store.getVersion);

    const [sol, setSol] = useState<SolTree | null>(null);
    const [file, setFile] = useState<FileInfo | null>(null);
    const [dialog, setDialog] = useState<DialogName | null>(null);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [sortEnabled, setSortEnabled] = useState(() => getCookie(SORT_COOKIE) === 'true');
    const [menu, setMenu] = useState<{ node: TreeNode; x: number; y: number } | null>(null);
    const [createTarget, setCreateTarget] = useState<{ node: TreeNode; context: CreateContext } | null>(null);
    const binaryTarget = useRef<((buffer: ArrayBuffer) => void) | null>(null);
    const sidebarRef = useRef<HTMLElement>(null);

    const closeDialog = useCallback(() => setDialog(null), []);
    const closeMenu = useCallback(() => setMenu(null), []);

    // Startup notices
    useEffect(() => {
        const notices: string[] = [];
        if (!navigator.onLine) notices.push('.minerva is now working in offline mode.');
        const missing = [
            !window.FileReader && 'FileReader API - Used to read user files',
            !window.Blob && 'Blob API - Used to save generated files',
            !window.Worker && 'JavaScript Workers - Used to process SOL files',
        ].filter(Boolean);
        if (missing.length)
            notices.push('It appears your browser does not support: ' + missing.join(', ') + '. Please upgrade your browser in order to use .minerva.');
        if (notices.length)
            showAlert(
                <>
                    {notices.map((n) => (
                        <p key={n}>{n}</p>
                    ))}
                </>,
                'Notice'
            );
    }, [showAlert]);

    const loadTree = (tree: SolTree, json: NodeJSON | null, info: FileInfo) => {
        store.search('');
        store.load(json, sortEnabled);
        setSol(tree);
        setFile(info);
    };

    const closeFile = () => {
        store.load(null, sortEnabled);
        setSol(null);
        setFile(null);
    };

    ///////////////
    // New/Open  //
    ///////////////

    const createFile = (name: string, amfVersion: number): boolean => {
        const tree = new SolTree();
        const parsed: ParsedSOL = {
            header: { amfVersion, dataLength: '?', fileName: name },
            fileName: name + '.sol',
            fileSize: 0,
            body: { Hello: { __traits: { type: 'String' }, value: 'World' } },
        };
        loadTree(tree, tree.obj2Tree(parsed), { name: parsed.fileName, size: 0 });
        closeDialog();
        return true;
    };

    const selectFile = (f: File): boolean => {
        if (f.name.toLowerCase().slice(-3) !== 'sol') {
            showAlert('Invalid file type!', 'Error');
            return false;
        }
        // Show the file and a placeholder while it's read and parsed
        loadTree(new SolTree(), { text: 'Parsing file...', icon: 'time', data: null }, { name: f.name, size: f.size, lastModified: f.lastModified });
        return true;
    };

    const parseFile = async (buffer: ArrayBuffer, f: File) => {
        const tree = new SolTree();
        const info = { name: f.name, size: f.size, lastModified: f.lastModified };
        try {
            const parsed = await readSOL(buffer, (warning) => showAlert(warning, 'Warning'));
            parsed.fileSize = f.size;
            parsed.fileName = f.name;
            loadTree(tree, tree.obj2Tree(parsed), info);
        } catch (e) {
            console.error(e);
            showAlert(
                <p>
                    Error reading file:<code>{(e as Error).message}</code>
                </p>,
                'Error'
            );
            loadTree(tree, { text: 'Error reading file', icon: 'error', data: null }, info);
        }
    };

    const importJSON = (name: string, json: string): string | null => {
        let o;
        try {
            o = JSON.parse(json);
        } catch (e) {
            return 'Invalid JSON: ' + (e as Error).message;
        }
        // JSON.parse also accepts numbers, strings and null
        if (!o || typeof o !== 'object') return 'Invalid JSON, base data is not an object.';
        const tree = new SolTree();
        tree.amfVersion = 3;
        const parsed: ParsedSOL = {
            header: { amfVersion: 3, dataLength: '?', fileName: name },
            fileName: name + '.sol',
            fileSize: '?',
            body: formatChildren(o, 3),
        };
        loadTree(tree, tree.obj2Tree(parsed), { name: parsed.fileName, size: '?' });
        closeDialog();
        return null;
    };

    //////////////////
    // Save/Export  //
    //////////////////

    const save = async () => {
        const root = store.root;
        if (!root?.data || !file) return;
        let body;
        try {
            body = buildSOLBody(root.children);
        } catch (e) {
            showAlert('Unable to save: ' + (e as Error).message, 'Error');
            return;
        }
        setDialog('saving');
        try {
            const header = root.data.value;
            const buffer = await writeSOL({
                fileName: header.fileName,
                amfVersion: header.amfVersion,
                filePath: root.data.value2 ? root.data.value2.filePath : null,
                data: body,
            });
            saveFile(new Blob([new Int8Array(buffer)], { type: 'application/octet-stream' }), file.name);
        } catch (e) {
            console.error(e);
            showAlert(
                <p>
                    Error saving file:<code>{(e as Error).message}</code>
                </p>,
                'Error'
            );
        } finally {
            setDialog((d) => (d === 'saving' ? null : d));
        }
    };

    const exportJSON = () => {
        const root = store.root;
        if (!root?.data || !file) return;
        const name = file.name.toLowerCase().endsWith('.sol') ? file.name.slice(0, -4) : file.name;
        saveFile(new Blob([JSON.stringify(treeToJSON(root))], { type: 'application/json' }), (name || 'JSON Export') + '.json');
    };

    /////////////////
    // Create item //
    /////////////////

    const openCreate = (node: TreeNode) => {
        const traits = node.data!.__traits;
        const count = String(node.children?.length ?? 0);
        // Indexed parents name new children by position
        setCreateTarget({ node, context: { label: traits.isIndexed || traits.canBeIndexed ? count : '', labelLocked: !!traits.isIndexed } });
        setDialog('create');
    };

    const createItem = (label: string, json: string) => {
        if (!createTarget || !sol) return;
        const parent = createTarget.node;
        const traits = parent.data!.__traits;
        closeDialog();
        try {
            // The value is JSON if it parses, otherwise a string
            let value;
            try {
                value = JSON.parse(json);
            } catch {
                value = json;
            }
            if (typeof value === 'string' && Date.parse(value)) value = new Date(value);

            const valueType = getDataType(value, sol.amfVersion);
            value = formatObject(value, sol.amfVersion);

            // Dictionary entries have a key, which can be any type
            if (traits.type === 'Dictionary') {
                let key;
                try {
                    key = JSON.parse(label);
                } catch {
                    key = label;
                }
                if (typeof key === 'string' && Date.parse(key)) key = new Date(key);
                value = { key: formatObject(key, sol.amfVersion), value, __traits: { type: 'DictionaryItem' } };
                label = '';
            }

            const o = sol.createNode(traits.type, parent.children?.length ?? 0, traits.class, label, value, valueType);
            if (typeof o === 'string') {
                showAlert(o, 'Error');
                return;
            }
            store.select(store.create(parent, o));
        } catch (e) {
            console.error(e);
            showAlert(
                <p>
                    Error creating node:<code>{(e as Error).message}</code>
                </p>,
                'Error'
            );
        }
    };

    //////////////////
    // Value edits  //
    //////////////////

    const onValueChange = (node: TreeNode, value: unknown) => {
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
        node.data!.value = value;
        store.touch();
    };

    const goToOrigin = (originId: number) => {
        const stack = store.root ? [store.root] : [];
        while (stack.length) {
            const n = stack.pop()!;
            if (n.data?.originId === originId && n.data.__traits.type !== 'Reference') {
                store.select(n);
                return;
            }
            if (n.children) stack.push(...n.children);
        }
        showAlert('The original object has been deleted.', 'Notice');
    };

    return (
        <>
            <AboutOverlay
                show={aboutOpen}
                onClose={() => setAboutOpen(false)}
                sortEnabled={sortEnabled}
                onSortChange={(enabled) => {
                    setSortEnabled(enabled);
                    setCookie(SORT_COOKIE, String(enabled), 365);
                }}
            />

            <Overlay id="overlay" show={dialog !== null} onClose={closeDialog}>
                <NewFileWindow show={dialog === 'new'} onCreate={createFile} />
                <OpenFileWindow show={dialog === 'open'} onSelect={selectFile} onLoad={parseFile} onFinished={closeDialog} />
                <SaveWindow show={dialog === 'saving'} />
                <ImportBinaryWindow
                    show={dialog === 'importBinary'}
                    onLoad={(buffer) => binaryTarget.current?.(buffer)}
                    onFinished={closeDialog}
                />
                <ImportJSONWindow show={dialog === 'importJSON'} onImport={importJSON} />
                <CreateWindow show={dialog === 'create'} context={createTarget?.context ?? null} onCreate={createItem} />
            </Overlay>

            <div id="application">
                <Nav
                    fileOpen={!!file}
                    hasData={!!file && !!store.root?.data}
                    onNew={() => setDialog('new')}
                    onOpen={() => setDialog('open')}
                    onImport={() => setDialog('importJSON')}
                    onExport={exportJSON}
                    onSave={save}
                    onClose={closeFile}
                    onAbout={() => setAboutOpen(true)}
                />
                <div id="wrapper">
                    <section id="sidebar" ref={sidebarRef}>
                        <FileTitle file={file} amfVersion={sol?.amfVersion} />
                        <SearchField key={file?.name} onSearch={(text) => store.search(text)} />
                        {store.root && <Tree store={store} scrollRef={sidebarRef} onContextMenu={(node, x, y) => setMenu({ node, x, y })} />}
                    </section>
                    <DetailsPane
                        node={store.focused}
                        file={file}
                        onValueChange={onValueChange}
                        onImportBinary={(receive) => {
                            binaryTarget.current = receive;
                            setDialog('importBinary');
                        }}
                        onGoToOrigin={goToOrigin}
                    />
                </div>
                <Footer />
            </div>

            {menu && <ContextMenu store={store} node={menu.node} x={menu.x} y={menu.y} onCreate={openCreate} onClose={closeMenu} />}
        </>
    );
}
