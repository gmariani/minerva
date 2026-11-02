// LZMA-JS 2.3.2 (https://github.com/LZMA-JS/LZMA-JS). Results are bytes as signed values (-128..127);
// decompress returns a string instead when the data is valid UTF-8.
declare const LZMA: {
    decompress(
        data: ArrayLike<number>,
        onFinish: (result: number[] | string | null, error?: Error) => void,
        onProgress?: (percent: number) => void
    ): void;
    // mode 1-9 sets the dictionary size and match finder, like lzma -1 ... -9
    compress(
        data: ArrayLike<number> | string,
        mode: number,
        onFinish: (result: number[] | null, error?: Error) => void,
        onProgress?: (percent: number) => void
    ): void;
};
export default LZMA;
