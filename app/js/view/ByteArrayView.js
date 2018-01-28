/* global Uint8Array, ByteArray, saveAs, Zlib, debug, Alert, LZMA */
/*
	- Interface -
	validate(input)
	show(node, input)
	hide()
	reset()
	save()

	The zlib compressed data format is described at http://www.ietf.org/rfc/rfc1950.txt
	The deflate compression algorithm is described at http://www.ietf.org/rfc/rfc1951.txt
	The lzma compression algorithm is described at http://www.7-zip.org/7z.html
*/

// http://stuk.github.io/jszip/
// https://github.com/imaya/zlib.js
// https://github.com/nodeca/pako
var ByteArrayView = function() {
    var elOffset,
        elValue,
        elString,
        elAlgorithm,
        elCompType,
        inputDelay = false,
        ba,
        callBackFunc,
        treeNode;

    /////////////////
    // Constructor //
    /////////////////
    function init(
        el /*:Element */,
        node /*:Object */,
        input /*:Object */,
        callBack /*:Function */
    ) /*:void */ {
        // Generate HTML
        var strHTML =
            '<h1>ByteArray</h1>' +
            '<nav>' +
            '<div class="field">' +
            '<select id="ByteArrayAlgorithm" class="grayed no-icon">' +
            '<option value="zlib">ZLIB</option>' +
            '<option value="deflate">Deflate</option>' +
            '<option value="lzma">LZMA</option>' +
            '</select>' +
            '<div class="arrow-select"></div>' +
            '<svg class="arrow-select-svg"/>' +
            '</div>' +
            '<input type="button" id="btnUncompress" name="btnUncompress" class="send" value="Uncompress">' +
            '<input type="button" id="btnCompress" name="btnCompress" class="send" value="Compress">' +
            '<div class="vr"></div>' +
            '<input type="button" id="btnImport" name="btnImport" class="send" value="Import">' +
            '<input type="button" id="btnExport" name="btnExport" class="send" value="Export">' +
            '</nav>' +
            '<p><strong>Possible Compression:</strong> <span id="compressionType"></span></p>' +
            '<div class="hex clearfix">' +
            '<pre class="hexscale">00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</pre>' +
            '<div id="ByteArrayOffset" class="hexoffset"></div>' +
            '<pre id="ByteArrayValue" class="hexdump" contentEditable="true" rows="20" cols="50"></pre>' +
            '<pre id="ByteArrayString" class="hextext"></pre>' +
            '</div>';

        el.html(strHTML);

        // Add view class for styling
        el.addClass('ByteArrayType');

        // Generate details
        elOffset = $('#ByteArrayOffset');
        elValue = $('#ByteArrayValue');
        elString = $('#ByteArrayString');
        elAlgorithm = $('#ByteArrayAlgorithm');
        ba = input;
        callBackFunc = callBack;
        treeNode = node;
        elCompType = $('#compressionType');
        elCompType.html(getCompType(ba));

        // Wire triggers for compress/uncompress buttons
        el.find('nav #btnUncompress').on('click', uncompress);
        el.find('nav #btnCompress').on('click', compress);
        el.find('nav #btnImport').on('click', baImport);
        el.find('nav #btnExport').on('click', baExport);

        // Format the input as it's typed
        elValue.on('keyup', function() {
            if (inputDelay) clearTimeout(inputDelay);
            inputDelay = setTimeout(function() {
                ba = validate(elValue.text());
                displayValue();

                // For now we save after each input
                if (ba) {
                    callBackFunc(ba, node);
                }
            }, 250);
        });

        displayValue();
    }

    function validate(input) {
        // Remove space holder dashes --
        input = input.replace(/\s--/g, '');

        // Remove trailing spaces
        input = input.replace(/\s+$/, '');

        // Split at spaces, which also removes them
        var arrInput = input.split(' ');
        var arrOutput = [];

        // Cycle through each chunk
        for (var i = 0, l = arrInput.length; i < l; i++) {
            var code = arrInput[i];

            // If chunk is larger, then break it apart
            if (code.length > 2) {
                for (var j = 0, l2 = code.length; j < l2; j += 2) {
                    var c = code.substr(j, 2);
                    arrOutput.push(parseInt(c, 16) & 0xff);
                }
            } else {
                arrOutput.push(parseInt(arrInput[i], 16) & 0xff);
            }
        }

        return arrOutput;
    }

    // Clear values and clear elements
    function reset() {
        if (inputDelay) clearTimeout(inputDelay);
        elCompType = elString = elValue = elOffset = elAlgorithm = ba = callBackFunc = treeNode = null;
    }

    // Convert the bytearray into spaced string, update offsets and display string version
    function displayValue() {
        // Format the bytearray into columns
        var str = '';
        var hex = '';
        var offsets =
                '<div><div><pre title="0x0000000000 = 16">0000000000</pre>',
            l;
        //console.log('Index', 'Decimal', 'Hex', 'Character');
        for (var i = 0, originalLen = (l = ba.length); i < l; i++) {
            if (l % 16 != 0) l += 16 - l % 16;

            if (i >= originalLen) {
                hex += '-- ';
                str += '.';
            } else {
                var b = ba[i].toString(16).toUpperCase();
                if (b.length < 2) b = '0' + b;
                hex += b + ' ';

                //hex += ba[i] + ' ';
                //var c = parseInt(ba[i], 16);
                var c = ba[i];
                //console.log(i, '"' + c + '"', '"' + ba[i] + '"', '"' + String.fromCharCode(c) + '"');
                if ((c >= 32 && c <= 127) || (c >= 160 && c <= 255)) {
                    var letter = String.fromCharCode(c);
                    if (letter == '<') letter = '&lt;';
                    if (letter == '>') letter = '&gt;';
                    str += letter;
                } else {
                    str += '.';
                }
            }

            // Every 16 columns, break
            if ((i + 1) % 16 == 0 && i + 1 < l) {
                hex += '<br/>';
                str += '<br/>';
                var s = '0000000000' + i.toString(16).toUpperCase();
                s = s.slice(-10);
                offsets +=
                    '<pre title="0x' + s + ' = ' + i + '">' + s + '</pre>';
            }
        }

        elOffset.html(offsets);
        elValue.html(hex);
        elString.html(str);
        elCompType.html(getCompType(ba));
    }

    function baExport(event) {
        var fileName = event.data.node.text,
            blob = new Blob([new Uint8Array(ba)], {
                type: 'application/octet-binary',
            });
        saveAs(blob, (fileName || 'bytearray') + '.dat');
    }

    function baImport() {
        $('#overlay').addClass('show');
        $('#importBinaryWindow').addClass('show');
    }

    // Called from modal after file loaded
    function baImport2(buffer) {
        var ba2 = new ByteArray(buffer, ByteArray.BIG_ENDIAN);
        var l = ba2.length;
        ba = [];
        while (l--) {
            var b = ba2.readUnsignedByte();
            ba.push(b);
        }

        displayValue();

        callBackFunc(ba, treeNode);
    }

    // Compress the displayed bytearray based on selected algorithm
    function compress() {
        switch (elAlgorithm.val()) {
            case 'zlib':
                /*
				Zlib.Deflate.CompressionType.NONE
				Zlib.Deflate.CompressionType.FIXED
				Zlib.Deflate.CompressionType.DYNAMIC
				
				-zlib magic headers-
				78 01 - No Compression/low
				78 9C - Default Compression 
				78 DA - Best Compression
				
				Headers differ only slightly
				Flash 0x78 0xDA
				JAVASCRIPT 0x78 0x5E
				for "Hello World!"
				*/
                ba = new Zlib.Deflate(ba, {
                    compressionType: Zlib.Deflate.CompressionType.FIXED,
                }).compress();
                if (debug) console.log('compress', ba);
                displayValue();

                if (ba) callBackFunc(ba, treeNode);
                break;
            case 'deflate':
                /*
				Zlib.Deflate.CompressionType.NONE
				Zlib.Deflate.CompressionType.FIXED
				Zlib.Deflate.CompressionType.DYNAMIC
				*/
                ba = new Zlib.RawDeflate(ba, {
                    compressionType: Zlib.Deflate.CompressionType.FIXED,
                }).compress();
                if (debug) console.log('compress', ba);
                displayValue();

                if (ba) callBackFunc(ba, treeNode);
                break;
            case 'lzma':
                // LZMA.compress(data, mode, on_finish, on_progress);
                // Mode 1: { dictionarySize: 20, fb: 64,  matchFinder: 0, lc: 3, lp: 0, pb: 2 }
                // Dictionary Size 1024Kb
                /*LZMA.compress(ba, 1, function(result) {
					if (result === false) {
						Alert.show('Error compressing via LZMA.', Alert.ERROR);
						return;
					}
					ba = result;
					console.log('compress', ba);
					displayValue();
					
					if (ba) callBackFunc(ba, treeNode);
				});*/
                Alert.show('Feature not available yet.', Alert.NOTICE);
                break;
        }
    }

    // Uncompress the displayed bytearray based on selected algorithm
    function uncompress() {
        switch (elAlgorithm.val()) {
            case 'zlib':
                ba = new Zlib.Inflate(ba).decompress();
                if (debug) console.log('uncompress', ba);
                displayValue();

                if (ba) callBackFunc(ba, treeNode);
                break;
            case 'deflate':
                ba = new Zlib.RawInflate(ba).decompress();
                if (debug) console.log('uncompress', ba);
                displayValue();

                if (ba) callBackFunc(ba, treeNode);
                break;
            case 'lzma':
                // LZMA.decompress(data, on_finish, on_progress);
                LZMA.decompress(ba, function(result) {
                    if (result === false) {
                        Alert.show(
                            'Error decompressing via LZMA.',
                            Alert.ERROR
                        );
                        return;
                    }
                    ba = result;
                    if (debug) console.log('uncompress', ba);
                    displayValue();

                    if (ba) callBackFunc(ba, treeNode);
                });
                break;
        }
    }

    function getCompType(input) {
        var msg = [];
        if (isZLIB(input)) msg.push('ZLIB');
        if (isLZMA(input)) msg.push('LZMA');
        if (isDeflate(input)) msg.push('Deflate');
        return msg.length == 0 ? 'None' : msg.join(',');
    }

    function readUB(numBits, baInput) {
        var _bitBuffer,
            _bitPosition = 8,
            val = 0;

        for (var i = 0; i < numBits; i++) {
            if (8 == _bitPosition) {
                _bitBuffer = baInput.readUnsignedByte();
                _bitPosition = 0;
            }

            val |= (_bitBuffer & (0x01 << _bitPosition++) ? 1 : 0) << i;
        }

        return val;
    }

    function isDeflate(input) {
        // Unreliable since first three bits are common
        //var ba2 = new Zlib.RawInflate(input),
        // Read the first 3 bits
        var hdr = input[0] & ((1 << 3) - 1),
            // BFINAL is set if and only if this is the last block of the data set.
            //isFinal = hdr & 0x1,
            // BTYPE specifies how the data are compressed
            type = (hdr >>>= 1);
        //console.log(isFinal, type);

        switch (type) {
            case 0:
                // 00 - no compression
                if (debug) console.log('Stored');
                if (0 + 1 >= input.length) {
                    //console.log('invalid uncompressed block header: LEN');
                    return false;
                }
                var len = input[0] | (input[1] << 8);

                if (2 + 1 >= input.length) {
                    //console.log('invalid uncompressed block header: NLEN');
                    return false;
                }
                var nlen = input[2] | (input[3] << 8);

                //console.log('guess', len, nlen, ~nlen);
                // check len & nlen
                if (len === ~nlen) {
                    //console.log('invalid uncompressed block header: length verify');
                    return false;
                }
                if (4 + len > input.length) {
                    //console.log('input buffer is broken');
                    return false;
                }
                return true;
            case 1:
                // 01 - compressed with fixed Huffman codes
                if (debug) console.log('Fixed Huffman codes');
                return true;
            case 2:
                // 10 - compressed with dynamic Huffman codes
                if (debug) console.log('Dynamic Huffman codes');
                return true;
            case 3:
                // 11 - reserved (error)
                if (debug) console.log('Reserved block type!!');
                return false;
            default:
                if (debug) console.log('Unexpected value ' + type + '!');
                return false;
        }
    }

    function isLZMA(input) {
        // Too short for properties
        if (input.length < 5) return false;

        //  Convert array to arraybuffer to bytearray
        var ba2 = new ByteArray(
            Uint8Array(input).buffer,
            ByteArray.LITTLE_ENDIAN
        );

        var lc,
            lp,
            pb,
            d = ba2.readUnsignedByte() & 0xff;
        if (d >= 9 * 5 * 5) {
            //throw "Incorrect LZMA properties";
            return false;
        }

        // lc the number of "literal context" bits [0, 8]
        // lp the number of "literal pos" bits [0, 4]
        // pb the number of "pos" bits [0, 4]

        lc = d % 9;
        d /= 9;
        pb = d / 5;
        lp = d % 5;
        //console.log(lc, lp, pb);

        if (lc < 0 || lc > 8) return false;
        if (lp < 0 || lp > 4) return false;
        if (pb < 0 || pb > 4) return false;

        // 32-bit unsigned integer, little-endian
        // Dictionary size	in bytes ranging from [0, 2^32 - 1]
        var dictSize = ba2.readUnsignedInt();
        //console.log('dict: ' + dictSize/1024 + ' Kb');
        if (dictSize < 0 || dictSize > 4294967295) return false;
        // Should be a multiple of 1024, no decimals should be present
        if (String(dictSize / 1024).indexOf('.') != -1) return false;

        /*
		If "Uncompressed size" field contains ones in all 64 bits, it means that
		uncompressed size is unknown and there is the "end marker" in stream,
		that indicates the end of decoding point.
		
		In opposite case, if the value from "Uncompressed size" field is not
		equal to ((2^64) - 1), the LZMA stream decoding must be finished after
		specified number of bytes (Uncompressed size) is decoded. And if there 
		is the "end marker", the LZMA decoder must read that marker also.
		*/
        // 64-bit unsigned integer, little-endian
        // Uncompressed size in bytes
        var uncompressedSize =
            ba2.readUnsignedByte() |
            (ba2.readUnsignedByte() << 8) |
            (ba2.readUnsignedByte() << 0x10) |
            (ba2.readUnsignedByte() << 0x18);
        //console.log('size: ' + uncompressedSize/1024 + 'Kb');
        if (uncompressedSize < 0) return false;

        return true;
    }

    function isZLIB(input) {
        // Compression Method and Flags
        var cmf = input[0];
        var flg = input[1];

        /*
		Zlib.CompressionMethod = {
			DEFLATE: 8,
			RESERVED: 15
		};
		*/

        // compression method
        switch (cmf & 0x0f) {
            case 8:
                //this.method = Zlib.CompressionMethod.DEFLATE;
                // true so far
                break;
            default:
                //throw new Error('unsupported compression method');
                return false;
        }

        // fcheck
        if (((cmf << 8) + flg) % 31 !== 0) {
            //throw new Error('invalid fcheck flag:' + ((cmf << 8) + flg) % 31);
            return false;
        }

        // fdict (not supported)
        if (flg & 0x20) {
            //throw new Error('fdict flag is not supported');
            return false;
        }

        return true;
    }

    ////////////
    // Public //
    ////////////
    this.init = init;
    this.validate = validate;
    this.reset = reset;
    this.baImport2 = baImport2;
};
