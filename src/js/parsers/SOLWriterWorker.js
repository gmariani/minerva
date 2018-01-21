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
function traceByteArray(ba) {
	trace(ba.position, Array.apply([], new Int8Array(ba._buffer.slice(0, ba.position))));
}
var ERROR = trace;
	
// Parse the individual file
onmessage = function(event) {
	var fileName = event.data.fileName;
	var amfVersion = event.data.amfVersion;
	var data = event.data.data;
	
	var ba = new ByteArray(null, ByteArray.LITTLE_ENDIAN);
	var baBody = new ByteArray(null, ByteArray.LITTLE_ENDIAN);
	
	amf0.reset();
	amf3.reset();
	
	// Signature, 'TCSO'
	baBody.writeUTFBytes('TCSO');

	// Unknown, 6 bytes long 0x00 0x04 0x00 0x00 0x00 0x00 0x00
	baBody.writeByte(0x00);
	baBody.writeByte(0x04);
	baBody.writeByte(0x00);
	baBody.writeByte(0x00);
	baBody.writeByte(0x00);
	baBody.writeByte(0x00);

	// Write SOL Name
	baBody.writeUTF(fileName);

	// AMF Encoding
	baBody.writeUnsignedInt(amfVersion);

	// Write Body
	for (var key in data) {
		if (amfVersion == 3) {
			amf3.writeString(baBody, key);
			amf3.writeData(baBody, data[key]);
		} else {
			baBody.writeUTF(key);
			amf0.writeData(baBody, data[key]);
		}
		baBody.writeByte(0); // Ending byte
	};
	
	// Unknown header 0x00 0xBF
	ba.writeByte(0x00);
	ba.writeByte(0xBF);

	// Length of the rest of the tag (filesize - 6)
	ba.writeUnsignedInt(baBody.position);

	// Write Body Data
	ba.writeBytes(baBody);
	
	// If Flex Data, write tag
	if (event.data.filePath) {
		// Unknown header 0x00 0xBF
		ba.writeByte(0x00);
		ba.writeByte(0xFF);
		
		baBody = new ByteArray(null, ByteArray.LITTLE_ENDIAN);
		
		// Write file path
		baBody.writeUTF(event.data.filePath);
		
		// Length of the rest of the path and bytes defining string length
		ba.writeUnsignedInt(baBody.position);
		
		// Write Body Data
		ba.writeBytes(baBody);
	}

	// Convert to an array to escape worker unphased
	var arrReturn = new Int8Array(ba._buffer.slice(0, ba.position));
	
	// Chrome x64 dies when using Array.apply on large array
	// https://code.google.com/p/chromium/issues/detail?id=252492
	/*if (navigator.userAgent.indexOf('x64') != -1 && navigator.userAgent.indexOf('Chrome') != -1) {
		arrReturn = [].concat.apply([], arrReturn);
	} else {*/
		arrReturn = Array.apply([], arrReturn);
	//}
	postMessage({ data:arrReturn });
};

})();