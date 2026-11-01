declare const LZMA: {
    decompress(data: number[], onFinish: (result: number[] | string | false) => void, onProgress?: (percent: number) => void): void;
    compress(data: number[] | string, mode: number, onFinish: (result: number[] | false) => void, onProgress?: (percent: number) => void): void;
};
export default LZMA;
