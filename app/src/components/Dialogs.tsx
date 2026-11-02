// The windows shown in the main overlay (New, Open, Import JSON, Create Item, Import Binary, Saving)
import { useRef, useState, type ChangeEvent } from 'react';
import { useAlert } from './Alert';
import { getOS } from '../util';

export type DialogName = 'new' | 'open' | 'importJSON' | 'create' | 'importBinary' | 'saving';

/////////////////////////////
// File input with progress //
/////////////////////////////

interface FileReadFieldProps {
    inputId: string;
    barId: string;
    cancelId: string;
    // Return false to reject the file before reading it
    onSelect?: (file: File) => boolean;
    onLoad: (buffer: ArrayBuffer, file: File) => void;
    // Called shortly after reading ends, to close the window
    onFinished: () => void;
}

function FileReadField({ inputId, barId, cancelId, onSelect, onLoad, onFinished }: FileReadFieldProps) {
    const showAlert = useAlert();
    const readerRef = useRef<FileReader | null>(null);
    const [loading, setLoading] = useState(false);
    const [percent, setPercent] = useState(0);

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset so choosing the same file again still triggers a change
        e.target.value = '';
        if (!file) {
            showAlert('Please select a file first!', 'Notice');
            return;
        }
        if (onSelect && !onSelect(file)) return;

        const reader = new FileReader();
        readerRef.current = reader;
        reader.onerror = () => {
            const err = reader.error;
            if (err?.name === 'AbortError') return;
            if (err?.name === 'NotFoundError') showAlert('File Not Found!', 'Error');
            else if (err?.name === 'NotReadableError') showAlert('File is not readable!', 'Error');
            else
                showAlert(
                    <p>
                        An error occurred reading this file.<code>{err?.message}</code>
                    </p>,
                    'Error'
                );
        };
        reader.onabort = () => showAlert('File read cancelled.', 'Information');
        reader.onprogress = (ev) => {
            if (ev.lengthComputable) setPercent(Math.min(99, Math.round((ev.loaded / ev.total) * 100)));
        };
        reader.onloadstart = () => {
            setPercent(0);
            setLoading(true);
        };
        reader.onloadend = () => {
            setPercent(100);
            readerRef.current = null;
            setTimeout(() => setLoading(false), 250);
            setTimeout(onFinished, 500);
        };
        reader.onload = () => onLoad(reader.result as ArrayBuffer, file);
        reader.readAsArrayBuffer(file);
    };

    return (
        <>
            <div className="field">
                <input type="file" id={inputId} onChange={onChange} />
                <span className="right-circled-icon icon" />
            </div>
            <div id={barId} className={'progressBar' + (loading ? ' loading' : '')}>
                <div className="percent" style={{ width: percent + '%' }}>
                    {percent}%
                </div>
            </div>
            <input
                type="button"
                id={cancelId}
                className={'send cancel' + (loading ? ' show' : '')}
                style={loading ? { display: 'inline-block' } : undefined}
                value="Cancel"
                onClick={() => readerRef.current?.abort()}
            />
        </>
    );
}

// Where Flash Player kept .sol files on this OS
function SolLocations() {
    const os = getOS();
    if (!os) return null;
    const npapi: Record<string, string> = {
        Win: '%APPDATA%\\Macromedia\\Flash Player\\',
        Mac: '%APPDATA%/Library/Preferences/Macromedia/Flash Player/',
        Linux: '~/.macromedia/Flash_Player/',
        Unix: '~/.macromedia/Flash_Player/',
    };
    const ppapi: Record<string, string> = {
        Win: '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Pepper Data\\Shockwave Flash\\WritableRoot\\#SharedObjects\\',
        Mac: '~/Library/Application Support/Google/Chrome/Default/Pepper Data/Shockwave Flash/WritableRoot/#SharedObjects/',
        Linux: '~/.config/google-chrome/Default/Pepper Data/Shockwave Flash/WritableRoot/#SharedObjects/',
    };
    return (
        <span id="solPath">
            <h3>{os.name} Local Shared Object Location</h3>
            <strong>NPAPI: </strong>
            <code>{npapi[os.short]}</code>
            {(os.short === 'Linux' || os.short === 'Unix') && (
                <>
                    <br />
                    <strong>Gnash: </strong>
                    <code>~/.gnash/SharedObjects/</code>
                </>
            )}
            {ppapi[os.short] && (
                <>
                    <br />
                    <strong>PPAPI: </strong>
                    <code>{ppapi[os.short]}</code>
                </>
            )}
        </span>
    );
}

/////////////
// Windows //
/////////////

export function NewFileWindow({ show, onCreate }: { show: boolean; onCreate: (name: string, amfVersion: number) => boolean }) {
    const showAlert = useAlert();
    const [name, setName] = useState('');
    const [amf, setAmf] = useState(3);
    const [error, setError] = useState(false);
    return (
        <div id="newWindow" className={show ? 'show' : undefined}>
            <h1>New File</h1>
            <div className="details no-float">
                <div className="field">
                    <input
                        type="text"
                        id="txtNewName"
                        placeholder="Filename"
                        className={error ? 'error' : undefined}
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError(false);
                        }}
                    />
                    <span className="right-circled-icon icon" />
                </div>
                <div className="field">
                    <p>
                        <strong>Select AMF version</strong>
                    </p>
                    <fieldset id="radAMFValue" className="blocks">
                        <input type="radio" value="0" name="radAMFValue" id="amf-1" checked={amf === 0} onChange={() => setAmf(0)} />
                        <label htmlFor="amf-1">AMF0</label>
                        <input type="radio" value="3" name="radAMFValue" id="amf-2" checked={amf === 3} onChange={() => setAmf(3)} />
                        <label htmlFor="amf-2">AMF3</label>
                    </fieldset>
                </div>
                <input
                    type="button"
                    id="btnCreateNew"
                    className="send"
                    value="Create"
                    onClick={() => {
                        if (name === '') {
                            showAlert('Please enter a file name.', 'Notice');
                            setError(true);
                            return;
                        }
                        if (onCreate(name, amf)) {
                            setName('');
                            setAmf(3);
                        }
                    }}
                />
                <span className="clearfix" />
            </div>
        </div>
    );
}

export function OpenFileWindow({ show, onSelect, onLoad, onFinished }: { show: boolean } & Pick<FileReadFieldProps, 'onSelect' | 'onLoad' | 'onFinished'>) {
    return (
        <div id="openWindow" className={show ? 'show' : undefined}>
            <h1>Open File</h1>
            <div className="clearfix">
                <FileReadField inputId="filesFile" barId="fileProgressBar" cancelId="btnFileCancel" onSelect={onSelect} onLoad={onLoad} onFinished={onFinished} />
            </div>
            <SolLocations />
        </div>
    );
}

export function SaveWindow({ show }: { show: boolean }) {
    return (
        <div id="saveWindow" className={show ? 'show' : undefined}>
            <h1>Saving File</h1>
            <img src={import.meta.env.BASE_URL + 'img/Mega_Man_Running.gif'} height="100" width="96" alt="looping loading graphic" />
        </div>
    );
}

export function ImportBinaryWindow({ show, onLoad, onFinished }: { show: boolean; onLoad: (buffer: ArrayBuffer) => void; onFinished: () => void }) {
    return (
        <div id="importBinaryWindow" className={show ? 'show' : undefined}>
            <h1>Import Binary</h1>
            <div className="details no-float">
                <FileReadField inputId="filesBinary" barId="binProgressBar" cancelId="btnBinCancel" onLoad={onLoad} onFinished={onFinished} />
                <span className="clearfix" />
            </div>
        </div>
    );
}

export function ImportJSONWindow({ show, onImport }: { show: boolean; onImport: (name: string, json: string) => string | null }) {
    const showAlert = useAlert();
    const [name, setName] = useState('');
    const [json, setJson] = useState('');
    const [nameError, setNameError] = useState(false);
    const [jsonError, setJsonError] = useState(false);
    return (
        <div id="importJSONWindow" className={show ? 'show' : undefined}>
            <h1>Import JSON</h1>
            <div className="details no-float">
                <div className="field">
                    <input
                        type="text"
                        id="txtJSONName"
                        placeholder="Filename"
                        className={nameError ? 'error' : undefined}
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setNameError(false);
                        }}
                    />
                    <span className="right-circled-icon icon" />
                </div>
                <div className="field">
                    <textarea
                        id="txtJSONValue"
                        rows={20}
                        cols={50}
                        className={'message' + (jsonError ? ' error' : '')}
                        placeholder="Valid JSON"
                        value={json}
                        onChange={(e) => {
                            setJson(e.target.value);
                            setJsonError(false);
                        }}
                    />
                    <span className="comment-icon icon" />
                </div>
                <input
                    type="button"
                    id="btnImportJSON"
                    className="send"
                    value="Import"
                    onClick={() => {
                        if (name === '') {
                            showAlert('Please enter a file name.', 'Notice');
                            setNameError(true);
                            return;
                        }
                        if (json === '') {
                            showAlert('Please enter valid JSON.', 'Notice');
                            setJsonError(true);
                            return;
                        }
                        const error = onImport(name, json);
                        if (error) {
                            showAlert(error, 'Error');
                            setJsonError(true);
                            return;
                        }
                        setName('');
                        setJson('');
                    }}
                />
                <span className="clearfix" />
            </div>
        </div>
    );
}

export interface CreateContext {
    label: string;
    labelLocked: boolean;
}

export function CreateWindow({ show, context, onCreate }: { show: boolean; context: CreateContext | null; onCreate: (label: string, value: string) => void }) {
    const showAlert = useAlert();
    const [label, setLabel] = useState('');
    const [value, setValue] = useState('');
    const [labelError, setLabelError] = useState(false);
    const [prevContext, setPrevContext] = useState(context);

    // Each time the window opens, start from the label the parent suggests
    if (context !== prevContext) {
        setPrevContext(context);
        setLabel(context?.label ?? '');
        setValue('');
        setLabelError(false);
    }

    return (
        <div id="createWindow" className={show ? 'show' : undefined}>
            <h1>Create Item</h1>
            <div className="details no-float">
                <h3>Label</h3>
                <p>Enter in the name for the new variable here. If creating a new entry in a Dictionary, you can enter valid JSON.</p>
                <div className="field">
                    <input
                        type="text"
                        id="txtNewLabel"
                        placeholder="Key"
                        className={labelError ? 'error' : undefined}
                        disabled={!!context?.labelLocked}
                        value={label}
                        onChange={(e) => {
                            setLabel(e.target.value);
                            setLabelError(false);
                        }}
                    />
                    <span className="right-circled-icon icon" />
                </div>

                <h3>Value</h3>
                <p>Enter in the value for the new variable here. This must be valid JSON. Example data:</p>
                <ul className="create-example">
                    <li>
                        Boolean
                        <br />
                        <code>false</code>
                    </li>
                    <li>
                        Integer
                        <br />
                        <code>12345</code>
                    </li>
                    <li>
                        Number
                        <br />
                        <code>3.141592653589793</code>
                    </li>
                    <li>
                        Array
                        <br />
                        <code>[1,2,3]</code>
                    </li>
                    <li>
                        String
                        <br />
                        <code>&quot;Hello World&quot;</code>
                    </li>
                    <li>
                        Date
                        <br />
                        <code>&quot;2011-10-10T14:48:00&quot;</code>{' '}
                        <a
                            style={{ textDecoration: 'underline' }}
                            title="Valid Date Formats"
                            href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse"
                            target="_blank"
                            rel="noopener"
                        >
                            Ref
                        </a>
                    </li>
                    <li>
                        Object
                        <br />
                        <code>{'{"p1":5,"p2":6}'}</code>
                    </li>
                </ul>
                <div className="field">
                    <textarea id="txtNewValue" rows={5} cols={50} className="message" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} />
                    <span className="comment-icon icon" />
                </div>
                <input
                    type="button"
                    id="btnCreateItem"
                    className="send"
                    value="Create"
                    onClick={() => {
                        if (label === '') {
                            showAlert('Please enter a valid name for the new property', 'Notice');
                            setLabelError(true);
                            return;
                        }
                        onCreate(label, value);
                    }}
                />
                <span className="clearfix" />
            </div>
        </div>
    );
}
