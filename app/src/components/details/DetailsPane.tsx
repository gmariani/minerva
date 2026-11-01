import type { FileInfo, TreeNode } from '../../types';
import { ArrayView, DictionaryItemView, DictionaryView, ObjectView, ReferenceView, SOLView, VectorView } from './InfoViews';
import { BooleanView, DateView, NumberView, StringView, XMLView } from './ValueViews';
import { ByteArrayView } from './ByteArrayView';

interface DetailsPaneProps {
    node: TreeNode | undefined;
    file: FileInfo | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each view has its own value type
    onValueChange: (node: TreeNode, value: any) => void;
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

export function DetailsPane({ node, file, onValueChange, onImportBinary, onGoToOrigin }: DetailsPaneProps) {
    const type = node?.data?.__traits.type?.toLowerCase() ?? '';
    // Remounting per node resets each view's own state
    const key = node?.id;
    const onChange = (value: unknown) => onValueChange(node!, value);

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
