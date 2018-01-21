(function() {

importScripts('../lib/ByteArray.js', '../lib/AMF0.js', '../lib/AMF3.js');

var amf0 = new AMF0();
var amf3 = new AMF3();

function trace() {
	var str = '';
	var arr = [];
	for (var i = 0, l = arguments.length; i < l; i++) {
		str += arguments[i];
		arr[i] = arguments[i];
		if (i != (l - 1)) str += ', ';
	}
	str += '\n';
	
	postMessage({
        type: "debug",
        message: arr
    });
	
	//dump(str);
}
var WARNING = function() {
	var str = '';
	var arr = [];
	for (var i = 0, l = arguments.length; i < l; i++) {
		str += arguments[i];
		arr[i] = arguments[i];
		if (i != (l - 1)) str += ', ';
	}
	str += '\n';
	
	postMessage({
        type: "warning",
        message: arr
    });
}

// Parse the individual file
onmessage = function(event) {
	var id = event.data.fileID;
	var ba = new ByteArray(event.data.text, ByteArray.BIG_ENDIAN);
	var obj = { };
	amf0.reset();
	amf3.reset();
	
	// Read Header
	var nLenFile = ba.getBytesAvailable();
	obj.header = {};
	
	// Unknown header 0x00 0xBF
	ba.readUnsignedShort();
	
	// Length of the rest of the file (filesize - 6)
	obj.header.dataLength = ba.readUnsignedInt();

	if (nLenFile != obj.header.dataLength + 6) {
		WARNING('Warning: Data Length Mismatch (File Size:' + nLenFile + ' != Reported Size:' + (obj.header.dataLength + 6) + ')' );
		//return;
	}
	
	// Signature, 'TCSO'
	var sig = ba.readUTFBytes(4);
	if ('TCSO' != sig) {
		throw 'Missing TCSO signature, not a SOL file';
		return;
	}
	
	// Unknown, 6 bytes long 0x00 0x04 0x00 0x00 0x00 0x00 0x00
	ba.readUTFBytes(6);
	
	// Read SOL Name
	obj.header.fileName = ba.readUTFBytes(ba.readUnsignedShort());
	
	// AMF Encoding
	obj.header.amfVersion = ba.readUnsignedInt();
	
	if(obj.header.amfVersion === 0 || obj.header.amfVersion === 3) {
		if(obj.header.fileName == "undefined") obj.header.fileName = "[SOL Name not Set]";
	} else {
		obj.header.fileName = "[Not yet supported SOL format]";
	}
	
	// Read Body
//trace('header-- ', obj.header);
	if (obj.header.amfVersion == 0 || obj.header.amfVersion == 3) {
		obj.body = {};
		while (ba.getBytesAvailable() > 1) {
			var varName = "";
			var varVal;
			if (obj.header.amfVersion == 3) {
				varName = amf3.readString(ba).value;
				varVal = amf3.readData(ba);
			} else {
				varName = ba.readUTF();
				varVal = amf0.readData(ba);
			}
			ba.readUnsignedByte(); // Ending byte
//trace('variable-- ', varName, varVal, varVal.__traits.type);
			obj.body[varName] = varVal;
		}
	}

	postMessage({fileID:id, data:obj});
};

})();