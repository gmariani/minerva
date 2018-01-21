(function() {

// AMF marker constants
var NUMBER_TYPE = 0;
var BOOLEAN_TYPE = 1;
var STRING_TYPE = 2;
var OBJECT_TYPE = 3;
var MOVIECLIP_TYPE = 4; // reserved, not supported
var NULL_TYPE = 5;
var UNDEFINED_TYPE = 6;
var REFERENCE_TYPE = 7;
var ECMA_ARRAY_TYPE = 8; // associative
var OBJECT_END_TYPE = 9;
var STRICT_ARRAY_TYPE = 10;
var DATE_TYPE = 11;
var LONG_STRING_TYPE = 12; // string.length > 2^16
var UNSUPPORTED_TYPE = 13;
var RECORD_SET_TYPE = 14; // reserved, not supported
var XML_OBJECT_TYPE = 15;
var TYPED_OBJECT_TYPE = 16;
var AVMPLUS_OBJECT_TYPE = 17;

/**
 * The maximum number of cached objects
 */
var MAX_STORED_OBJECTS = 1024;

var EMPTY_STRING = "";

function trace() {
	var str = '',
		arr = [], i, l;
	for (i = 0, l = arguments.length; i < l; i++) {
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
var ERROR = trace;
	
AMF0 = function() {
	
	//--------------------------------------
	//  Public Vars
	//--------------------------------------
	
	//--------------------------------------
	//  Private Vars
	//--------------------------------------
	
	// The actual object cache used to store references
	this.readObjectCache = [];
	
	// The raw binary data
	this._rawData;
	
	// The decoded data
	this._data;
	
	// AMF3 Parser
	this._amf3;
	
	//--------------------------------------
	//  Constructor
	//--------------------------------------
	
};

AMF0.prototype = {
	
	deserialize: function(data) {
		this.reset();
		
		this._rawData = data;
		this._data = this.readData(this._rawData);
	},
	
	reset: function() {
		this.readObjectCache = [];
		
		if (this._amf3 != null) this._amf3.reset();
	},
	
	readData: function(ba, type) {
		if (type == null) type = ba.readByte();
		switch (type) {
			case NUMBER_TYPE : return this.readNumber(ba);
			case BOOLEAN_TYPE : return this.readBoolean(ba);
			case STRING_TYPE : return this.readString(ba);
			case OBJECT_TYPE : return this.readObject(ba);
			//case MOVIECLIP_TYPE : return null;
			case NULL_TYPE : return this.readNull(ba);
			case UNDEFINED_TYPE : return this.readUndefined(ba);
			case REFERENCE_TYPE : return this.getObjectReference(ba.readUnsignedShort());
			case ECMA_ARRAY_TYPE : return this.readECMAArray(ba);
			case OBJECT_END_TYPE :
				// Unexpected object end tag in AMF stream
				trace("AMF0::readData - Warning : Unexpected object end tag in AMF stream");
				return this.readNull(ba);
			case STRICT_ARRAY_TYPE : return this.readArray(ba);
			case DATE_TYPE : return this.readDate(ba);
			case LONG_STRING_TYPE : return this.readLongString(ba);
			case UNSUPPORTED_TYPE :
				// Unsupported type found in AMF stream
				trace("AMF0::readData - Warning : Unsupported type found in AMF stream");
				return this.readNull(ba);
			case RECORD_SET_TYPE :
				// AMF Recordsets are not supported
				trace("AMF0::readData - Warning : Unexpected recordset in AMF stream");
				return this.readNull(ba);
			case XML_OBJECT_TYPE : return this.readXML(ba);
			case TYPED_OBJECT_TYPE : return this.readTypedObject(ba);
			case AVMPLUS_OBJECT_TYPE :
				if (this._amf3 == null) this._amf3 = new AMF3();
				return this._amf3.readData(ba);
			/*
			With the introduction of AMF 3 in Flash Player 9 to support ActionScript 3.0 and the 
			new AVM+, the AMF 0 format was extended to allow an AMF 0 encoding context to be 
			switched to AMF 3. To achieve this, a new type marker was added to AMF 0, the 
			avmplus-object-marker. The presence of this marker signifies that the following Object is 
			formatted in AMF 3.
			*/
			default: ERROR("AMF0::readData - Error : Undefined AMF0 type encountered '" + type + "'");
		}
	},
	
	/**
	 * writeData checks to see if the type was declared and then either
	 * auto negotiates the type or relies on the user defined type to
	 * serialize the data into amf
	 *
	 * Note that autoNegotiateType was eliminated in order to tame the 
	 * call stack which was getting huge and was causing leaks
	 *
	 * manualType allows the developer to explicitly set the type of
	 * the returned data.  The returned data is validated for most of the
	 * cases when possible.  Some datatypes like xml and date have to
	 * be returned this way in order for the Flash client to correctly serialize them
	 * 
	 * recordsets appears top on the list because that will probably be the most
	 * common hit in this method.  Followed by the
	 * datatypes that have to be manually set.  Then the auto negotiatable types last.
	 * The order may be changed for optimization.
	 */
	writeData: function(ba, node) {
		var type = node.__traits.type;
		if (node.__traits.hasOwnProperty('origType')) type = node.__traits.origType;
		
		/*if (_avmPlus) {
			if(amf3 == null) amf3 = new AMF3();
			ba.writeByte(AVMPLUS_OBJECT_TYPE);
			amf3.writeData(ba, value);
		}*/
		trace('writeData ' + type, node.value);
		switch(type) {
			case "Undefined" 		: this.writeUndefined(ba); break;
			case "Null" 			: this.writeNull(ba); break;
			case "Boolean" 			: this.writeBoolean(ba, node.value); break;
			case "Integer" 			: // Fall through for the editor guessing data types
			case "Number" 			: this.writeNumber(ba, node.value); break;
			case "String" 			: 
									/*if(node.value == "__unsupported") {
										this.writeUnsupported(ba);
									} else {*/
										this.writeString(ba, node.value);
									//}
									break;
			case "LongString" 		: this.writeLongString(ba, node.value); break;
			case "Date" 			: this.writeDate(ba, node.value); break;
			case "Array" 			: this.writeArray(ba, node.value); break; // TODO: Could not generate a demo to test
			case "ECMAArray" 		: this.writeECMAArray(ba, node.value); break;
			case "Object" 			: 
									if (node.__traits.class == 'Object') {
										this.writeObject(ba, node.value, node.__traits);
									} else {
										this.writeTypedObject(ba, node.value, node.__traits);
									};
									break;
			case "XML" 				: this.writeXML(ba, node.value); break;
			default: throw Error("Undefined AMF0 type encountered '" + type + "'");
		};
	},
	
	readNumber: function(ba) {
		return { value:ba.readDouble(), __traits:{ type:'Number' }};
	},
	
	/**
	 * writeNumber writes the number code (0x00) and the numeric data to the output stream
	 * All numbers passed through remoting are floats.
	 */
	writeNumber: function(ba, value) {
		ba.writeByte(NUMBER_TYPE);
		ba.writeDouble(value);
	},
	
	readBoolean: function(ba) {
		return { value:ba.readBoolean(), __traits:{ type:'Boolean' }};
	},
	
	/**
	 * writeBoolean writes the boolean code (0x01) and the data to the output stream
	 */
	writeBoolean: function(ba, value) {
		ba.writeByte(BOOLEAN_TYPE);
		ba.writeBoolean(value);
	},
	
	readString: function(ba) {
		return { value:ba.readUTF(), __traits:{ type:'String' }};
	},
	
	/**
	 * writeString writes the string code (0x02) and the UTF8 encoded
	 * string to the output stream.
	 * Note: strings are truncated to 64k max length. Use XML as type 
	 * to send longer strings
	 */
	writeString: function(ba, value) {
		if (value.length < 65536) {
			ba.writeByte(STRING_TYPE);
			ba.writeUTF(value);
		} else {
			this.writeLongString(ba, value);
		};
	},
	
	readObject: function(ba, internal) {
		var obj = {},
			varName = ba.readUTF(),
			type = ba.readByte(),
			val;
		
		// 0x00 0x00 (varname) 0x09 (end object type)
		while (varName.length > 0 && type != OBJECT_END_TYPE) {
			obj[varName] = this.readData(ba, type);
			varName = ba.readUTF();
			type = ba.readByte();
		};
		if (internal) return obj;
		
		val = { value:obj, __traits:{ type:'Object' }};
		this.readObjectCache.push(val);
		return val;
	},
	
	writeObject: function(ba, value, traits, internal) {
		if (internal || this.setObjectReference(ba, value)) {
			if (internal === undefined) ba.writeByte(OBJECT_TYPE);
			
			for (var key in value) {
				ba.writeUTF(key);
				this.writeData(ba, value[key]);
			};
			
			// End tag 00 00 09
			ba.writeUTF(EMPTY_STRING);
			//ba.writeByte(0x00);
			//ba.writeByte(0x00);
			ba.writeByte(OBJECT_END_TYPE);
		};
	},
	
	readNull: function(ba) {
		return { value:null, __traits:{ type:'Null' }};
	},
	
	/**
	 * writeNull writes the null code (0x05) to the output stream
	 */
	writeNull: function(ba) {
		ba.writeByte(NULL_TYPE);
	},
	
	readUndefined: function(ba) {
		return { value:null, __traits:{ type:'Undefined' }};
	},
	
	/**
	 * writeNull writes the undefined code (0x06) to the output stream
	 */
	writeUndefined: function(ba) {
		ba.writeByte(UNDEFINED_TYPE);
	},
	
	readECMAArray: function(ba) {
		var arr = {},
			l = ba.readUnsignedInt(),
			varName = ba.readUTF(),
			type = ba.readByte(),
			val;
		
		// 0x00 0x00 (varname) 0x09 (end object type)
		while (varName.length > 0 && type != OBJECT_END_TYPE) {
			arr[varName] = this.readData(ba, type);
			varName = ba.readUTF();
			type = ba.readByte();
		}
		
		val = { value:arr, __traits:{ type:'ECMAArray' }};
		this.readObjectCache.push(val);
		return val;
	},
	
	writeECMAArray: function(ba, value) {
		if (this.setObjectReference(ba, value)) {
			var l = 0, key;
			ba.writeByte(ECMA_ARRAY_TYPE);
			
			// Count only indexes, not prop names
			for (key in value) {
				if (!isNaN(key)) l++;
			}
			ba.writeUnsignedInt(l);
			
			for (key in value) {
				ba.writeUTF(key);
				this.writeData(ba, value[key]);
			};
			
			// End tag 00 00 09
			ba.writeByte(0x00);
			ba.writeByte(0x00);
			ba.writeByte(OBJECT_END_TYPE);
		};
	},
	
	readArray: function(ba) {
		var l = ba.readUnsignedInt(),
			arr = [],
			i, val;
		for (i = 0; i < l; ++i) {
			arr.push(this.readData(ba));
		}
		
		val = { value:arr, __traits:{ type:'Array' }};
		this.readObjectCache.push(val);
		return val;
	},
	
	/**
	 * Write a plain numeric array without anything fancy
	 */
	writeArray: function(ba, value) {
		if (this.setObjectReference(ba, value)) {
			var l = value.length, i;
			ba.writeByte(STRICT_ARRAY_TYPE);
			ba.writeInt(l);
			for (i = 0; i < l; ++i) {
				this.writeData(ba, value[i]);
			}
		}
	},
	
	readDate: function(ba) {
		var ms = ba.readDouble(),
		
		/*
		We read in the timezone but do nothing with the value as
		we expect dates to be written in the UTC timezone. Client
		and servers are responsible for applying their own
		timezones.
		*/
			timezone = ba.readShort(); // reserved, not supported. should be set to 0x0000
		//if (timezone > 720) timezone = -(65536 - timezone);
		//timezone *= -60;
		
		return { value:new Date(ms), __traits:{ type:'Date' }};
	},
	
	/**
	 * writeData writes the date code (0x0B) and the date value to the output stream
	 */
	writeDate: function(ba, value) {
		ba.writeByte(DATE_TYPE);
		
		// Convert numbers to dates
		if (!(value instanceof Date)) value =  new Date(value);
		
		ba.writeDouble(value.getTime()); // write date (milliseconds from 1970)
		ba.writeShort(value.getTimezoneOffset()); // Apparenlty this is used according to Flash CS5
		//ba.writeShort(0); // timezone reserved, not supported. should be set to 0x0000
	},
	
	readLongString: function(ba) {
		return { value:ba.readUTFBytes(ba.readUnsignedInt()), __traits:{ type:'LongString' }};
	},
	
	writeLongString: function(ba, value) {
		if (value.length < 65536) {
			this.writeString(ba, value);
		} else {
			ba.writeByte(LONG_STRING_TYPE);
			ba.writeUnsignedInt(value.length);
			ba.writeUTFBytes(value);
		};
	},
	
	readXML: function(ba) {
		return { value:this.readLongString(ba).value, __traits:{ type:'XML' }};
	},
	
	/**
	 * writeXML writes the xml code (0x0F) and the XML string to the output stream
	 * Note: strips whitespace
	 * @param string $d The XML string
	 */
	writeXML: function(ba, value) {
		if (this.setObjectReference(ba, value)) {
			ba.writeByte(XML_OBJECT_TYPE);
			var strXML = value.toString();
			strXML = strXML.replace(/^\s+|\s+$/g, ''); // Trim
			//strXML = strXML.replace(/\>(\n|\r|\r\n| |\t)*\</g, "><"); // Strip whitespaces, not done by native encoder
			ba.writeUnsignedInt(strXML.length);
			ba.writeUTFBytes(strXML);
		}
	},
	
	readTypedObject: function(ba) {
		var className = ba.readUTF(), obj, val;
		try {
			obj = this.readObject(ba, true);
		} catch (e) {
			ERROR("AMF0::readTypedObject - Error : Cannot parse custom class");
		}
		
		val = { value:obj, __traits:{ type:'Object', class:className }};
		this.readObjectCache.push(val);
		return val;
	},
	
	writeTypedObject: function(ba, value, traits) {
		if (this.setObjectReference(ba, value)) {
			ba.writeByte(TYPED_OBJECT_TYPE);
			
			ba.writeUTF(traits.class);
			this.writeObject(ba, value, traits, true);
		}
	},
	
	getObjectReference: function(ref) {
		if (ref >= this.readObjectCache.length) {
			ERROR("AMF0::getObjectReference - Error : Undefined object reference '" + ref + "'");
			return null;
		}
		
		return this.readObjectCache[ref];
	},
	
	setObjectReference: function(ba, o) {
		var refNum;
		var json = JSON.stringify(o);
		if (this.writeObjectCache != null && (refNum = this.writeObjectCache.indexOf(json)) != -1) {
			ba.writeByte(REFERENCE_TYPE);
			this.writeUnsignedShort(ba, refNum);
			return false;
		} else {
			if (this.writeObjectCache == null) this.writeObjectCache = [];
			if (this.writeObjectCache.length < MAX_STORED_OBJECTS) {
				this.writeObjectCache.push(json);
			}
			return true;
		}
	},
	
	writeUnsignedShort: function(ba, value) {
		var b1 = (value / 256);
		var b0 = (value % 256);
		ba.writeByte(b0);
		ba.writeByte(b1);
	},
	
	/**
	 * writeUnsupported writes the unsupported code (13) to the output stream
	 */
	writeUnsupported: function(ba) {
		ba.writeByte(UNSUPPORTED_TYPE);
	}
};

})();