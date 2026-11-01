/*
    The zlib compressed data format is described at http://www.ietf.org/rfc/rfc1950.txt
    The deflate compression algorithm is described at http://www.ietf.org/rfc/rfc1951.txt
    The lzma compression algorithm is described at http://www.7-zip.org/7z.html
*/
import { useEffect, useRef, useState } from 'react';
import { constants, deflate, deflateRaw, inflate, inflateRaw } from 'pako';
import LZMA from '../../vendor/lzma.js';
import { useAlert } from '../Alert';
import { saveFile } from '../../util';
import type { ValueViewProps } from './ValueViews';

type Algorithm = 'zlib' | 'deflate' | 'lzma';

// Parses the hex dump text back into bytes; "--" marks padding in the last row
function parseHex(input: string): number[] {
    const bytes: number[] = [];
    for (const chunk of input.replace(/\s--/g, '').trim().split(/\s+/)) {
        if (!chunk) continue;
        // Runs of digits without spaces are read two at a time
        for (let i = 0; i < chunk.length; i += 2) bytes.push(parseInt(chunk.substr(i, 2), 16) & 0xff);
    }
    return bytes;
}

function hexDump(bytes: number[]): { offsets: string[]; hex: string; text: string } {
    const offsets: string[] = [];
    const hexRows: string[] = [];
    const textRows: string[] = [];
    for (let row = 0; row < Math.max(1, Math.ceil(bytes.length / 16)); row++) {
        offsets.push(('0000000000' + (row * 16).toString(16).toUpperCase()).slice(-10));
        let hex = '';
        let text = '';
        for (let i = row * 16; i < row * 16 + 16; i++) {
            if (i >= bytes.length) {
                hex += '-- ';
                text += '.';
                continue;
            }
            const b = bytes[i];
            hex += b.toString(16).toUpperCase().padStart(2, '0') + ' ';
            text += (b >= 32 && b <= 127) || (b >= 160 && b <= 255) ? String.fromCharCode(b) : '.';
        }
        hexRows.push(hex);
        textRows.push(text);
    }
    return { offsets, hex: hexRows.join('\n'), text: textRows.join('\n') };
}

function isZLIB(input: number[]): boolean {
    // Compression Method and Flags
    const cmf = input[0];
    const flg = input[1];
    // Compression method 8 (deflate), a valid check value, and no preset dictionary
    return (cmf & 0x0f) === 8 && ((cmf << 8) + flg) % 31 === 0 && !(flg & 0x20);
}

function isDeflate(input: number[]): boolean {
    // Unreliable since first three bits are common
    // BTYPE in bits 1-2 of the first block header
    switch ((input[0] & 0x07) >>> 1) {
        case 0: {
            // Stored block: LEN and NLEN must be complements of each other
            if (input.length < 4) return false;
            const len = input[0] | (input[1] << 8);
            const nlen = input[2] | (input[3] << 8);
            return len !== ~nlen && 4 + len <= input.length;
        }
        case 1: // fixed Huffman codes
        case 2: // dynamic Huffman codes
            return true;
        default: // reserved
            return false;
    }
}

function isLZMA(input: number[]): boolean {
    // Too short for properties
    if (input.length < 5) return false;
    // lc, lp and pb packed into one byte
    if ((input[0] & 0xff) >= 9 * 5 * 5) return false;
    // Dictionary size, little-endian 32-bit, should be a multiple of 1024
    const view = new DataView(Uint8Array.from(input.slice(1, 5)).buffer);
    return view.getUint32(0, true) % 1024 === 0;
}

function getCompressionType(input: number[]): string {
    const types: string[] = [];
    if (isZLIB(input)) types.push('ZLIB');
    if (isLZMA(input)) types.push('LZMA');
    if (isDeflate(input)) types.push('Deflate');
    return types.length ? types.join(',') : 'None';
}

interface ByteArrayViewProps extends ValueViewProps {
    // Opens the Import Binary dialog; it calls back with the chosen file's contents
    onImport: (receive: (buffer: ArrayBuffer) => void) => void;
}

export function ByteArrayView({ node, onChange, onImport }: ByteArrayViewProps) {
    const showAlert = useAlert();
    const [bytes, setBytes] = useState<number[]>(() => Array.from(node.data!.value as ArrayLike<number>));
    const [algorithm, setAlgorithm] = useState<Algorithm>('zlib');
    const hexRef = useRef<HTMLPreElement>(null);
    const typing = useRef<number | undefined>(undefined);
    const dump = hexDump(bytes);

    // The hex dump is edited in place, so it's written directly rather than re-rendered by React
    useEffect(() => {
        if (hexRef.current) hexRef.current.textContent = dump.hex;
    }, [dump.hex]);

    useEffect(() => () => clearTimeout(typing.current), []);

    const update = (next: number[]) => {
        setBytes(next);
        onChange(next);
    };

    const tryCodec = (fn: () => Uint8Array) => {
        try {
            update(Array.from(fn()));
        } catch (error) {
            // pako throws on invalid input
            showAlert('Error uncompressing: ' + error, 'Error');
        }
    };

    const compress = () => {
        const input = Uint8Array.from(bytes);
        switch (algorithm) {
            case 'zlib':
                /*
                -zlib magic headers-
                78 01 - No Compression/low
                78 9C - Default Compression
                78 DA - Best Compression
                */
                tryCodec(() => deflate(input, { strategy: constants.Z_FIXED }));
                break;
            case 'deflate':
                tryCodec(() => deflateRaw(input, { strategy: constants.Z_FIXED }));
                break;
            case 'lzma':
                showAlert('Feature not available yet.', 'Notice');
                break;
        }
    };

    const uncompress = () => {
        switch (algorithm) {
            case 'zlib':
                tryCodec(() => inflate(Uint8Array.from(bytes)));
                break;
            case 'deflate':
                tryCodec(() => inflateRaw(Uint8Array.from(bytes)));
                break;
            case 'lzma':
                LZMA.decompress(bytes, (result) => {
                    if (result === false) {
                        showAlert('Error decompressing via LZMA.', 'Error');
                        return;
                    }
                    update(typeof result === 'string' ? Array.from(new TextEncoder().encode(result)) : Array.from(result, (b) => b & 0xff));
                });
                break;
        }
    };

    return (
        <>
            <h1>ByteArray</h1>
            <nav>
                <div className="field">
                    <select id="ByteArrayAlgorithm" className="grayed no-icon" value={algorithm} onChange={(e) => setAlgorithm(e.target.value as Algorithm)}>
                        <option value="zlib">ZLIB</option>
                        <option value="deflate">Deflate</option>
                        <option value="lzma">LZMA</option>
                    </select>
                    <div className="arrow-select" />
                    <svg className="arrow-select-svg" />
                </div>
                <input type="button" id="btnUncompress" className="send" value="Uncompress" onClick={uncompress} />
                <input type="button" id="btnCompress" className="send" value="Compress" onClick={compress} />
                <div className="vr" />
                <input type="button" id="btnImport" className="send" value="Import" onClick={() => onImport((buffer) => update(Array.from(new Uint8Array(buffer))))} />
                <input
                    type="button"
                    id="btnExport"
                    className="send"
                    value="Export"
                    onClick={() => saveFile(new Blob([Uint8Array.from(bytes)], { type: 'application/octet-binary' }), (node.text || 'bytearray') + '.dat')}
                />
            </nav>
            <p>
                <strong>Possible Compression:</strong> <span id="compressionType">{getCompressionType(bytes)}</span>
            </p>
            <div className="hex clearfix">
                <pre className="hexscale">00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</pre>
                <div className="hexBody">
                    <div id="ByteArrayOffset" className="hexoffset">
                        {dump.offsets.map((offset, i) => (
                            <pre key={i} title={'0x' + offset + ' = ' + i * 16}>
                                {offset}
                            </pre>
                        ))}
                    </div>
                    <pre
                        id="ByteArrayValue"
                        ref={hexRef}
                        className="hexdump"
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={false}
                        onKeyUp={() => {
                            clearTimeout(typing.current);
                            typing.current = window.setTimeout(() => {
                                if (hexRef.current) update(parseHex(hexRef.current.textContent ?? ''));
                            }, 250);
                        }}
                    />
                    <pre id="ByteArrayString" className="hextext">
                        {dump.text}
                    </pre>
                </div>
            </div>
        </>
    );
}
