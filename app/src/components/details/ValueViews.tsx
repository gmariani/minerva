// Details views that edit a node's value
import { useState } from 'react';
import type { TreeNode } from '../../types';
import { timeAgo } from '../../util';
import { numberType } from '../../model/actions';

export interface ValueViewProps {
    node: TreeNode;
    // Several nodes are being edited and their values differ: show "Various" until the user edits
    various?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each view has its own value type
    onChange: (value: any) => void;
}

const VARIOUS = 'Various';

function isValidNumber(input: string): boolean {
    const n = parseFloat(input);
    return !isNaN(n) && Math.abs(n) <= Number.MAX_VALUE && (input.match(/\./g) || []).length <= 1 && (input.match(/-/g) || []).length <= 1;
}

export function NumberView({ node, various, onChange }: ValueViewProps) {
    const [type, setType] = useState(node.data!.__traits.type);
    const [error, setError] = useState(false);
    const initial = parseFloat(node.data!.value);

    return (
        <>
            <h1>{type}</h1>
            <p className="description">
                The Number (Double) data type represents an 8 byte IEEE-754 double precision floating point value in network byte order (sign bit in low
                memory). The range of values represented is a Number or an integer of value greater than or equal to 2<sup>28</sup> or an unsigned value
                greater than or equal to 2<sup>29</sup>.
            </p>
            <p className="description">
                An Integer data type represents a 32-bit signed number. The range of values represented by an Integer is -2,147,483,648 (-2^31) to
                2,147,483,647 (2^31-1).
            </p>
            <div className="field">
                <input
                    type="text"
                    id="NumberValue"
                    inputMode="decimal"
                    className={error ? 'error' : undefined}
                    placeholder={various ? VARIOUS : undefined}
                    defaultValue={various ? '' : isNaN(initial) ? 'NaN' : String(initial)}
                    onChange={(e) => {
                        const input = e.target.value;
                        if (!isValidNumber(input)) {
                            setError(true);
                            return;
                        }
                        setError(false);
                        const value = parseFloat(input);
                        setType(numberType(value));
                        onChange(value);
                    }}
                />
                <span className="right-circled-icon icon" />
            </div>
        </>
    );
}

export function BooleanView({ node, various, onChange }: ValueViewProps) {
    const value = node.data!.value;
    const [mixed, setMixed] = useState(!!various);
    return (
        <>
            <h1>Boolean</h1>
            <div className="field">
                <div className={'slide-chk' + (mixed ? ' various' : '')}>
                    <input
                        id="BooleanValue"
                        type="checkbox"
                        defaultChecked={!mixed && (value === 1 || value === true)}
                        onChange={(e) => {
                            setMixed(false);
                            onChange(e.target.checked ? 1 : 0);
                        }}
                    />
                    <label htmlFor="BooleanValue" />
                </div>
                {mixed && <span className="various-label">{VARIOUS}</span>}
            </div>
        </>
    );
}

// Returns the parser's error text, or null for well-formed XML
function xmlError(input: string): string | null {
    const dom = new DOMParser().parseFromString(input, 'text/xml');
    const error = dom.getElementsByTagName('parsererror')[0];
    return error ? error.textContent : null;
}

export function XMLView({ node, various, onChange }: ValueViewProps) {
    const [error, setError] = useState(() => (various ? null : xmlError(node.data!.value)));
    const [edited, setEdited] = useState(false);
    return (
        <>
            <h1>XML</h1>
            <div className="field">
                <textarea
                    id="XMLValue"
                    rows={20}
                    cols={50}
                    className={'message' + (error ? ' error' : '')}
                    placeholder={various ? VARIOUS : undefined}
                    defaultValue={various ? '' : node.data!.value}
                    onChange={(e) => {
                        const err = xmlError(e.target.value);
                        setEdited(true);
                        setError(err);
                        if (!err) onChange(e.target.value);
                    }}
                />
                <span className="comment-icon icon" />
            </div>
            <pre className="XMLError">{error ?? (various && !edited ? 'Values differ' : 'XML is valid')}</pre>
        </>
    );
}

///////////////////
// String encode //
///////////////////

type Encoding = 'html' | 'uriUTF8' | 'b64UTF8' | 'hex' | 'binary';

function encode(str: string, encoding: Encoding): string {
    switch (encoding) {
        case 'b64UTF8':
            return btoa(encodeURIComponent(str));
        case 'uriUTF8':
            return encodeURIComponent(str);
        case 'html': {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        case 'hex':
            return Array.from(str, (c) => c.charCodeAt(0).toString(16)).join('');
        case 'binary':
            return Array.from(str, (c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
    }
}

function decode(str: string, encoding: Encoding): string {
    try {
        switch (encoding) {
            case 'b64UTF8':
                return decodeURIComponent(atob(str));
            case 'uriUTF8':
                return decodeURIComponent(str);
            case 'html':
                // DOMParser doesn't run scripts or event handlers, unlike setting innerHTML
                return new DOMParser().parseFromString(str, 'text/html').documentElement.textContent ?? '';
            case 'hex': {
                let out = '';
                for (let i = 0; i < str.length; i += 2) out += String.fromCharCode(parseInt(str.substr(i, 2), 16));
                return out;
            }
            case 'binary': {
                str = str.replace(/\s/g, '');
                if (str.length % 8 != 0) return '?';
                let out = '';
                for (let i = 0; i < str.length; i += 8) out += String.fromCharCode(parseInt(str.substring(i, i + 8), 2));
                return out;
            }
        }
    } catch (err) {
        return (err as Error).message;
    }
}

function isURL(str: string): boolean {
    try {
        return decodeURIComponent(str) != str;
    } catch {
        // A stray '%' isn't valid URL encoding
        return false;
    }
}

function getEncodingType(str: string): string {
    const types: string[] = [];
    if (isURL(str)) types.push('URL');
    if (/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(str)) types.push('Base64');
    if (/^[0-9a-fA-F]+$/.test(str)) types.push('Hex');
    if (/^[01]+$/.test(str)) types.push('Binary');
    return types.length ? types.join(',') : 'None';
}

export function StringView({ node, various, onChange }: ValueViewProps) {
    const [text, setText] = useState<string>(various ? '' : String(node.data!.value));
    const [mixed, setMixed] = useState(!!various);
    const [encoding, setEncoding] = useState<Encoding>('html');
    const update = (value: string) => {
        setMixed(false);
        setText(value);
        onChange(value);
    };
    // Encoding the empty "Various" field would overwrite every value
    const codecTitle = mixed ? 'The selected values differ' : undefined;
    return (
        <>
            <h1>String</h1>
            <nav>
                <div className="field">
                    <select id="StringAlgorithm" className="grayed no-icon" value={encoding} onChange={(e) => setEncoding(e.target.value as Encoding)}>
                        <option value="html">HTML</option>
                        <option value="uriUTF8">URL</option>
                        <option value="b64UTF8">Base64</option>
                        <option value="hex">Hex</option>
                        <option value="binary">Binary</option>
                    </select>
                    <div className="arrow-select" />
                    <svg className="arrow-select-svg" />
                </div>
                <input
                    type="button"
                    id="btnDecode"
                    className="send"
                    value="Decode"
                    disabled={mixed}
                    title={codecTitle}
                    onClick={() => update(decode(text, encoding))}
                />
                <input
                    type="button"
                    id="btnEncode"
                    className="send"
                    value="Encode"
                    disabled={mixed}
                    title={codecTitle}
                    onClick={() => update(encode(text, encoding))}
                />
            </nav>
            <p>
                <strong>Possible Encoding:</strong> <span id="encodingType">{mixed ? VARIOUS : getEncodingType(text)}</span>
            </p>
            <div className="field">
                <textarea
                    id="StringValue"
                    className="message"
                    placeholder={mixed ? VARIOUS : undefined}
                    value={text}
                    onChange={(e) => update(e.target.value)}
                />
                <span className="comment-icon icon" />
            </div>
        </>
    );
}

//////////
// Date //
//////////

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

// datetime-local inputs take local time as YYYY-MM-DDTHH:mm:ss.sss
function toLocalInput(d: Date): string {
    return (
        d.getFullYear() +
        '-' +
        pad(d.getMonth() + 1) +
        '-' +
        pad(d.getDate()) +
        'T' +
        pad(d.getHours()) +
        ':' +
        pad(d.getMinutes()) +
        ':' +
        pad(d.getSeconds()) +
        '.' +
        pad(d.getMilliseconds(), 3)
    );
}

export function DateView({ node, various, onChange }: ValueViewProps) {
    // Copy: the node's value mustn't change unless the user edits it
    const [date, setDate] = useState(() => new Date(node.data!.value));
    const [mixed, setMixed] = useState(!!various);
    const valid = !isNaN(date.getTime());
    const offset = -date.getTimezoneOffset();
    const zone = 'UTC' + (offset >= 0 ? '+' : '-') + pad(Math.floor(Math.abs(offset) / 60)) + ':' + pad(Math.abs(offset) % 60);
    return (
        <>
            <h1>Date</h1>
            <div className="field">
                <input
                    type="datetime-local"
                    id="DateValue"
                    step="0.001"
                    defaultValue={valid && !mixed ? toLocalInput(date) : ''}
                    onChange={(e) => {
                        const d = new Date(e.target.value);
                        if (isNaN(d.getTime())) return;
                        setMixed(false);
                        setDate(d);
                        onChange(d);
                    }}
                />
                <span className="right-circled-icon icon" />
            </div>
            <p className="description" title={valid && !mixed ? 'Shown in your local time (' + zone + ')' : undefined}>
                {mixed ? VARIOUS : valid ? timeAgo(date) + ' (' + date.toISOString().replace('T', ' ').replace('Z', ' UTC') + ')' : 'Invalid date'}
            </p>
        </>
    );
}
