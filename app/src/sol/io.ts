// Runs the SOL reader/writer workers
/* eslint-disable @typescript-eslint/no-explicit-any -- worker messages carry untyped AMF data */
import type { ParsedSOL } from './tree';

// Reads a SOL file. onWarning gets non-fatal problems (e.g. a truncated file that was partly read).
export function readSOL(buffer: ArrayBuffer, onWarning: (message: string) => void): Promise<ParsedSOL> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./SOLReaderWorker.js', import.meta.url), { type: 'module' });
        worker.onmessage = (e) => {
            switch (e.data.type) {
                case 'debug':
                case 'warning':
                    return;
                case 'alert':
                    onWarning(e.data.message);
                    return;
                case 'error':
                    worker.terminate();
                    reject(new Error(e.data.message));
                    return;
            }
            worker.terminate();
            resolve(e.data.data);
        };
        worker.onerror = (e) => {
            worker.terminate();
            reject(new Error(e.message + ' (' + e.filename + ':' + e.lineno + ')'));
        };
        worker.postMessage({ text: buffer, fileID: 0 }, [buffer]);
    });
}

export interface SOLContents {
    fileName: string;
    amfVersion: number;
    filePath: string | null;
    // How AMF0 object references are numbered: 'as2', 'as3' or 'values' (see AMF0.reset)
    amf0References?: string;
    data: Record<string, any>;
}

export function writeSOL(contents: SOLContents): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./SOLWriterWorker.js', import.meta.url), { type: 'module' });
        worker.onmessage = (e) => {
            if (e.data.type == 'debug' || e.data.type == 'warning') return;
            worker.terminate();
            resolve(e.data.data);
        };
        worker.onerror = (e) => {
            worker.terminate();
            reject(new Error(e.message + ' (' + e.filename + ':' + e.lineno + ')'));
        };
        worker.postMessage(contents);
    });
}
