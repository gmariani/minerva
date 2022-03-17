/* global AMF0, AMF3, ByteArray */
(function () {
    importScripts('../lib/ByteArray.js', '../lib/AMF0.js', '../lib/AMF3.js');

    var amf0 = new AMF0();
    var amf3 = new AMF3();
    var debug = false;

    function trace() {
        if (!debug) return;

        //var str = '';
        var arr = [];
        for (var i = 0, l = arguments.length; i < l; i++) {
            //str += arguments[i];
            arr[i] = arguments[i];
            //if (i != l - 1) str += ', ';
        }
        //str += '\n';

        postMessage({
            type: 'debug',
            message: arr,
        });

        //dump(str);
    }

    var TAGS = {};
    TAGS[-1] = { name: 'Header', func: DefineHeader };
    TAGS[2] = { name: 'LSO', func: DefineLSO };
    TAGS[3] = { name: 'FilePath', func: DefineFilePath };

    var TAG_CODES = {
        Header: -1,
        LSO: 2,
        FilePath: 3,
    };

    function DefineLSO(ba) {
        this.header = new DefineHeader(ba);

        // Signature, 'TCSO'
        var sig = ba.readUTFBytes(4);
        if ('TCSO' != sig) throw 'Missing TCSO signature, not a SOL file';

        // Unknown, 6 bytes long 0x00 0x04 0x00 0x00 0x00 0x00 0x00
        ba.readUTFBytes(6);

        // Read SOL Name
        this.header.fileName = ba.readUTFBytes(ba.readUnsignedShort());

        // AMF Encoding
        this.header.amfVersion = ba.readUnsignedInt();

        if (this.header.amfVersion === 0 || this.header.amfVersion === 3) {
            if (this.header.fileName == 'undefined') this.header.fileName = '[SOL Name not Set]';
        } else {
            this.header.fileName = '[Unsupported SOL format]';
        }

        // Read Body
        //trace('header-- ', this.header);
        if (this.header.amfVersion == 0 || this.header.amfVersion == 3) {
            this.body = {};
            while (ba.getBytesAvailable() > 1 && ba.position < this.header.contentLength) {
                var varName = '';
                var varVal;
                if (this.header.amfVersion == 3) {
                    varName = amf3.readString(ba).value;
                    varVal = amf3.readData(ba);
                } else {
                    varName = ba.readUTF();
                    varVal = amf0.readData(ba);
                }
                ba.readUnsignedByte(); // Ending byte
                //trace('variable-- ', varName, varVal, varVal.__traits.type);
                this.body[varName] = varVal;
            }
        }
    }

    function DefineFilePath(ba) {
        this.header = new DefineHeader(ba);
        this.filePath = ba.readUTFBytes(ba.readUnsignedShort(), true);
    }

    function DefineHeader(ba) {
        if (!ba) return;
        var pos = ba.position;
        this.tagTypeAndLength = ba.readUI16();
        this.contentLength = this.tagTypeAndLength & 0x3f;

        // Long header
        if (this.contentLength == 0x3f) this.contentLength = ba.readSI32();

        this.type = this.tagTypeAndLength >> 6;
        this.headerLength = ba.position - pos; // *
        this.tagLength = this.headerLength + this.contentLength; // *
        this.name = TAGS[this.type] ? TAGS[this.type].name : '?'; // *
    }

    function readTags(ba) {
        // Peek at header
        var startPos = ba.position,
            obj = {},
            header = new DefineHeader(ba);
        ba.position = startPos;

        while (header) {
            var o = TAGS[header.type];
            if (o) {
                var strTrace = 'LOG - ' + ba.position + ' - ' + TAGS[header.type].name + ' (' + header.type + ') - ' + header.contentLength;
                var tag = new o.func(ba, obj);
                trace(strTrace, tag);
                switch (header.type) {
                    case TAG_CODES.LSO:
                        obj.header = tag.header;
                        obj.body = tag.body;
                        break;
                    case TAG_CODES.FilePath:
                        obj.flex = tag;
                        break;
                }

                // Re-align in the event a tag was read improperly
                if (0 != header.tagLength - (ba.position - startPos))
                    trace('Error reading ' + TAGS[header.type].name + ' tag! Start:' + startPos + ' End:' + ba.position + ' BytesAvailable:' + (header.tagLength - (ba.position - startPos)), tag);
                ba.seek(header.tagLength - (ba.position - startPos));
            } else {
                trace('Unknown tag type', header.type);
                ba.seek(header.tagLength); // Skip bytes
            }

            // End Tag
            //if (header.type == 0) break;
            if (ba.getBytesAvailable() <= 0) break;

            // Peek at header
            startPos = ba.position;
            header = new DefineHeader(ba);
            ba.position = startPos;
        }

        return obj;
    }

    // Parse the individual file
    onmessage = function (event) {
        var id = event.data.fileID;
        var ba = new ByteArray(event.data.text, ByteArray.BIG_ENDIAN);
        var obj = {};
        amf0.reset();
        amf3.reset();

        obj = readTags(ba);

        postMessage({ fileID: id, data: obj });
    };
})();
