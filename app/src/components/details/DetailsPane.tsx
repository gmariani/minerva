import type { FileInfo, TreeNode } from '../../types';
import { ArrayView, DictionaryItemView, DictionaryView, ObjectView, ReferenceView, SOLView, VectorView } from './InfoViews';
import { BooleanView, DateView, NumberView, StringView, XMLView } from './ValueViews';
import { ByteArrayView } from './ByteArrayView';

interface DetailsPaneProps {
    node: TreeNode | undefined;
    // The whole selection; more than one node switches to batch editing
    selection: TreeNode[];
    file: FileInfo | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each view has its own value type
    onValueChange: (nodes: TreeNode[], value: any) => void;
    onImportBinary: (receive: (buffer: ArrayBuffer) => void) => void;
    onGoToOrigin: (originId: number) => void;
}

// The styling class each view's type adds to the pane
const TYPE_CLASS: Record<string, string> = {
    localsharedobject: 'ObjectType',
    array: 'ArrayType',
    object: 'ObjectType',
    dictionary: 'DictionaryType',
    dictionaryitem: 'DictionaryItemType',
    number: 'NumberType',
    integer: 'NumberType',
    bytearray: 'ByteArrayType',
    boolean: 'BooleanType',
    xml: 'XMLType',
    string: 'StringType',
    vector: 'VectorType',
    date: 'DateType',
    reference: 'ReferenceType',
};

// Types that can be set on several nodes at once
const BATCH_TYPES = ['number', 'boolean', 'xml', 'string', 'date'];

const typeOf = (node: TreeNode) => node.data?.__traits.type?.toLowerCase() ?? '';

// Integers and Numbers switch into each other as they're edited, so they edit together
const batchType = (node: TreeNode) => (typeOf(node) === 'integer' ? 'number' : typeOf(node));

// Comparable form of a node's value
function valueKey(node: TreeNode, type: string): unknown {
    const value = node.data!.value;
    if (type === 'date') return new Date(value).getTime();
    if (type === 'boolean') return value === 1 || value === true;
    return String(value);
}

const MAX_NAMES = 8;

function SelectionBanner({ nodes, label }: { nodes: TreeNode[]; label: string }) {
    // The parent tells apart same-named members of different objects; the root is just the file name, so it's left out
    const names = nodes.slice(0, MAX_NAMES).map((n) => (n.parent?.parent ? n.parent.text + ' › ' : '') + n.text);
    const more = nodes.length - names.length;
    return (
        <div className="multi-banner" role="status">
            <strong>{label}</strong>
            <span className="multi-names" title={nodes.map((n) => n.text).join(', ')}>
                {names.join(', ')}
                {more > 0 && ' and ' + more + ' more'}
            </span>
        </div>
    );
}

function batchView({ nodes, onValueChange }: { nodes: TreeNode[]; onValueChange: DetailsPaneProps['onValueChange'] }) {
    const types = new Set(nodes.map(batchType));
    if (types.size > 1) {
        return {
            type: '',
            view: (
                <>
                    <SelectionBanner nodes={nodes} label={nodes.length + ' items selected'} />
                    <p className="description">You may only change variables of the same type.</p>
                </>
            ),
        };
    }

    const type = [...types][0];
    const typeName = nodes[0].data?.__traits.type ?? 'item';
    if (!BATCH_TYPES.includes(type)) {
        return {
            type: '',
            view: (
                <>
                    <SelectionBanner nodes={nodes} label={nodes.length + ' items selected'} />
                    <p className="description">Only Numbers, Booleans, Strings, XML and Dates can be changed together. {typeName} values must be edited one at a time.</p>
                </>
            ),
        };
    }

    const first = valueKey(nodes[0], type);
    const various = nodes.some((n) => valueKey(n, type) !== first);
    const props = {
        // Remount when the selection changes
        key: 'batch:' + nodes.map((n) => n.id).join(','),
        node: nodes[0],
        various,
        onChange: (value: unknown) => onValueChange(nodes, value),
    };
    const editor = {
        number: <NumberView {...props} />,
        boolean: <BooleanView {...props} />,
        xml: <XMLView {...props} />,
        string: <StringView {...props} />,
        date: <DateView {...props} />,
    }[type];
    return {
        type,
        view: (
            <>
                <SelectionBanner nodes={nodes} label={'Editing ' + nodes.length + ' ' + (type === 'number' ? 'Number' : typeName) + 's — changes apply to all of them'} />
                {editor}
            </>
        ),
    };
}

export function DetailsPane({ node, selection, file, onValueChange, onImportBinary, onGoToOrigin }: DetailsPaneProps) {
    if (selection.length > 1) {
        const { type, view } = batchView({ nodes: selection, onValueChange });
        return (
            <section id="details" className={'details multi' + (TYPE_CLASS[type] ? ' ' + TYPE_CLASS[type] : '')}>
                {view}
            </section>
        );
    }

    const type = node ? typeOf(node) : '';
    // Remounting per node resets each view's own state
    const key = node?.id;
    const onChange = (value: unknown) => onValueChange([node!], value);

    let view = null;
    if (node?.data) {
        switch (type) {
            case 'localsharedobject':
                view = file && <SOLView key={key} node={node} file={file} />;
                break;
            case 'array':
                view = <ArrayView key={key} node={node} />;
                break;
            case 'object':
                view = <ObjectView key={key} node={node} />;
                break;
            case 'dictionary':
                view = <DictionaryView key={key} node={node} />;
                break;
            case 'dictionaryitem':
                view = <DictionaryItemView key={key} node={node} />;
                break;
            case 'number':
            case 'integer':
                view = <NumberView key={key} node={node} onChange={onChange} />;
                break;
            case 'bytearray':
                view = <ByteArrayView key={key} node={node} onChange={onChange} onImport={onImportBinary} />;
                break;
            case 'boolean':
                view = <BooleanView key={key} node={node} onChange={onChange} />;
                break;
            case 'xml':
                view = <XMLView key={key} node={node} onChange={onChange} />;
                break;
            case 'string':
                view = <StringView key={key} node={node} onChange={onChange} />;
                break;
            case 'vector':
                view = <VectorView key={key} node={node} />;
                break;
            case 'date':
                view = <DateView key={key} node={node} onChange={onChange} />;
                break;
            case 'reference':
                view = <ReferenceView key={key} node={node} onGoTo={onGoToOrigin} />;
                break;
        }
    }

    return (
        <section id="details" className={'details' + (view && TYPE_CLASS[type] ? ' ' + TYPE_CLASS[type] : '')}>
            {view}
        </section>
    );
}
