// Details views that only describe a node
import type { FileInfo, TreeNode } from '../../types';
import { formatSize } from '../../util';

export function SOLView({ node, file }: { node: TreeNode; file: FileInfo }) {
    const header = node.data!.value;
    const flex = node.data!.value2;
    const modified = file.lastModified
        ? new Date(file.lastModified).toLocaleDateString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZoneName: 'short',
              timeZone: 'UTC',
          })
        : 'n/a';
    return (
        <>
            <h1>{file.name}</h1>
            <div>
                <h3>File</h3>
                <p>
                    <strong>File Path:</strong> <code>{file.name}</code>
                    <br />
                    <strong>File Size:</strong> <code>{formatSize(file.size)}</code>
                    <br />
                    <strong>Last Modified:</strong> <code>{modified}</code>
                </p>
                <h3>Local Shared Object</h3>
                <p>
                    <strong>Name:</strong> <code>{header.fileName}</code>
                    <br />
                    <strong>AMF Version:</strong> <code>{header.amfVersion}</code>
                    <br />
                    <strong>Tag Size:</strong> <code>{formatSize(header.contentLength)}</code>
                </p>
                {flex && (
                    <>
                        <h3>Unknown Data</h3>
                        <p>
                            <strong>Local Shared Object Path:</strong> <code>{flex.filePath}</code>
                            <br />
                            <strong>Tag Size:</strong> <code>{formatSize(flex.header.contentLength)}</code>
                        </p>
                    </>
                )}
            </div>
        </>
    );
}

export function ArrayView({ node }: { node: TreeNode }) {
    return (
        <>
            <h1>Array</h1>
            <div>
                <p>
                    <strong>Children:</strong> {node.children?.length ?? 0}
                </p>
            </div>
        </>
    );
}

export function ObjectView({ node }: { node: TreeNode }) {
    const traits = node.data!.__traits;
    return (
        <>
            <h1>Object</h1>
            <div>
                {'class' in traits && (
                    <p>
                        <strong>Class:</strong> <code>{traits.class}</code>
                    </p>
                )}
                {'dynamic' in traits && (
                    <p>
                        <strong>Is Dynamic?</strong> <span>{String(traits.dynamic)}</span>
                    </p>
                )}
                {'externalizable' in traits && (
                    <p>
                        <strong>Is Externalizable:</strong> <span>{String(traits.externalizable)}</span>
                    </p>
                )}
                {'count' in traits && (
                    <p>
                        <strong>Member Count:</strong> {traits.count}
                    </p>
                )}
                {'members' in traits && (
                    <p>
                        <strong>Members:</strong> <code>{JSON.stringify(traits.members, null, '\t')}</code>
                    </p>
                )}
            </div>
        </>
    );
}

export function DictionaryView({ node }: { node: TreeNode }) {
    const traits = node.data!.__traits;
    return (
        <>
            <h1>Dictionary</h1>
            <div>
                {'weakKeys' in traits && (
                    <p>
                        <strong>Weak Keys:</strong> <span>{String(traits.weakKeys)}</span>
                    </p>
                )}
            </div>
        </>
    );
}

export function DictionaryItemView({ node }: { node: TreeNode }) {
    const key = node.data!.value.key.__traits;
    const value = node.data!.value.value.__traits;
    return (
        <>
            <h1>Dictionary Item</h1>
            <div>
                <p>
                    <strong>Key:</strong> {key.type + (key.class ? ' : ' + key.class : '')}
                </p>
                <p>
                    <strong>Value:</strong> {value.type}
                </p>
            </div>
        </>
    );
}

export function VectorView({ node }: { node: TreeNode }) {
    const traits = node.data!.__traits;
    return (
        <>
            <h1>{'Vector.<' + traits.class + '>'}</h1>
            <div>
                <p>
                    <strong>Class:</strong> <code>{traits.class}</code>
                </p>
                {'fixed' in traits && (
                    <p>
                        <strong>Is Fixed?</strong> <span>{String(traits.fixed)}</span>
                    </p>
                )}
            </div>
        </>
    );
}

// An object that contains itself (a circular AMF reference), which can't be expanded into the tree
export function ReferenceView({ node, onGoTo }: { node: TreeNode; onGoTo: (originId: number) => void }) {
    return (
        <>
            <h1>Reference</h1>
            <p>
                This is <strong>{node.data!.path}</strong> itself: the object contains itself, so it can&apos;t be shown again here.
            </p>
            <input type="button" className="send" value="Go to original" onClick={() => onGoTo(node.data!.value)} />
        </>
    );
}
