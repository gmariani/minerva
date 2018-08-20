/*jshint browser:true, devel:true */
/*global debug, Alert, util */
/*
Expected format of the node (there are no required fields)

{
	id          : "string" // will be autogenerated if omitted
	text        : "string" // node text
	icon        : "string" // string for custom
	state       : {
		opened    : boolean  // is the node open
		disabled  : boolean  // is the node disabled
		selected  : boolean  // is the node selected
	},
	children    : []  // array of strings or objects
	li_attr     : {}  // attributes for the generated LI node
	a_attr      : {}  // attributes for the generated A node
}
*/

var SOL = function() {
    var amfVersion = '?';
    var reLT = new RegExp('<', 'g');
    var reGT = new RegExp('>', 'g');

    this.getAMFVersion = function() {
        return amfVersion;
    };

    this.isValid = function() {
        return false;
    };

    this.getTitle = function(file) {
        return (
            '<h1>' +
            escape(file.name) +
            '</h1><small>File Size: ' +
            util.formatSize(file.size) +
            ' | AMF Version: ' +
            amfVersion +
            ' | Last Modified: ' +
            (file.lastModifiedDate
                ? file.lastModifiedDate.toLocaleDateString()
                : 'n/a') +
            '</small>'
        );
    };

    function normalizeType(type) {
        var lower_type = type.toLowerCase();
        switch (lower_type) {
            case 'longstring':
                return 'String';
            case 'xml':
            case 'xmldocument':
                return 'XML';
            case 'double':
                return 'Number';
            case 'true':
            case 'false':
                return 'Boolean';
            case 'ecmaarray':
                return 'Array';
            case 'vector.<int>':
            case 'vector.<uint>':
            case 'vector.<number>':
            case 'vector.<object>':
                return 'Vector';
        }

        // Typed vector
        if (lower_type.indexOf('vector') == 0) return 'Vector';

        return type;
    }

    function getChild(label, data, count) {
        //if (debug) console.log('getChild(',label,data,count,')');
        if (!data) console.error('No Data!', label);
        var val = data.value;
        if (!data.__traits) console.warn('No Traits!', data);
        var type = data.__traits.type;
        var val_class;
        var o = {};

        if (type == 'DictionaryItem') {
            val = { Key: data.key, Value: data.value };
            //val = val.value;
            var keyType = data.key.__traits.type;
            /*switch (keyType) {
				case 'Vector.<int>' :
				case 'Vector.<uint>' :
				case 'Vector.<Number>' :
				case 'Vector.<Object>' :
				case 'ByteArray' :
				case 'Object' :
				case 'Dictionary' :
					o.text = '[' + keyType + ']'; break;
				case 'Date' :
					o.text = String(data.key.value); break;
				case 'Array' :
				case 'String' :
				case 'XML' :
				case 'Boolean' :
				case 'Integer' :
				case 'Number' :
				default:
					o.text = util.getSnippet(util.htmlEntities(data.key.value));
			}*/
            o.text = 'Item ' + count;
            if (keyType == 'Object') {
                val_class = data.key.__traits.class || 'Object';
            }
        } else {
            o.text = label.replace(reLT, '&lt;').replace(reGT, '&gt;');
            if (type == 'Object') {
                val_class = data.__traits.class || 'Object';
            }
        }

        // Standardize the AS3 data types to JavaScript data types
        var normal_type = normalizeType(type);

        // Set icon to data type, if it's not set, use error
        o.icon = type ? type.toLowerCase() : 'error';

        // If one of the 4 Vector data types, set at vector
        if (o.icon.indexOf('vector') != -1) o.icon = 'vector';

        // If complex object, populate children
        if (
            (type == 'Object' ||
                type == 'ECMAArray' ||
                type == 'Array' ||
                type.indexOf('Vector') === 0 ||
                type == 'Dictionary' ||
                type == 'DictionaryItem') &&
            val
        ) {
            o.children = getChildren(val, type);
        }

        // Set rollOver title to data type
        o.li_attr = {};
        o.li_attr.title = type;
        // If type is an object, append the class
        if (type == 'Object') o.li_attr.title += ' : ' + val_class;

        o.data = {};
        o.data.__traits = {};
        //o.data.title = type;

        // Get traits of Object
        if (type == 'Object') {
            o.data.__traits = data.__traits;
            o.data.__traits.class = val_class;
            o.data.__traits.canRename = true;
            val = {};
        }

        // Extract class type for Vector
        // Set vector as an indexed only type, dictionary is but user can't change the index
        if (normal_type == 'Vector' /* || type == 'Dictionary'*/) {
            o.data.__traits = data.__traits;
            o.data.__traits.canBeIndexed = true;
            val = [];
        }

        // Pass the entire object
        if (type == 'DictionaryItem') {
            val = data;

            o.icon = data.value.__traits.type
                ? data.value.__traits.type.toLowerCase()
                : 'error';
            o.li_attr.title =
                'Key: ' +
                data.key.__traits.type +
                ' | Value: ' +
                data.value.__traits.type;
            o.data.__traits.canRename = false;
            o.data.__traits.canCreate = false;
        }

        // AS3 is not like JS, arrays can act like objects
        //if (type == 'ECMAArray' || type == 'Array') {
        /*if (type == 'Array') {
			o.data.__traits.canBeIndexed = true;
			val = {};
		};*/
        if (type == 'Dictionary') {
            o.data.__traits.canBeIndexed = true;
        }

        // Prevent basic data types from containing children
        switch (type) {
            case 'Date':
            case 'String':
            case 'LongString':
            case 'ByteArray':
            case 'XML':
            case 'XMLDocument':
            case 'Null':
            case 'Undefined':
            case 'Boolean':
            case 'True':
            case 'False':
            case 'Integer':
            case 'Number':
                o.data.__traits.canCreate = false;
        }

        // Maintain original type
        switch (type) {
            case 'LongString':
            case 'Double':
            case 'XMLDocument':
            case 'True':
            case 'False':
            case 'ECMAArray':
            case 'Vector.<int>':
            case 'Vector.<uint>':
            case 'Vector.<Number>':
                o.data.__traits.origType = type;
                break;
            default:
                if (type.indexOf('Vector.<') != -1)
                    o.data.__traits.origType = 'Vector.<Object>';
                break;
        }

        o.data.__traits.type = normal_type;
        o.data.value = val;
        return o;
    }

    function getChildren(obj, parType) {
        var arrChildren = [],
            count = 1,
            prop,
            o;
        for (prop in obj) {
            o = getChild(prop, obj[prop], count++);
            // Since these items have special name or indices, they cannot be renamed
            if (
                parType.indexOf('Vector') === 0 ||
                parType == 'DictionaryItem'
            ) {
                o.data.__traits.canRename = false;
            }
            if (parType == 'Array' || parType == 'ECMAArray') {
                o.data.__traits.canRename = true;
            }
            // DictionaryItem is not a real type and cannot contain any more children
            // Can't edit the dictionary item children since they don't really exist in AS3
            if (parType == 'DictionaryItem') {
                o.data.__traits.canCreate = false;
                o.data.__traits.canRename = false;
                o.data.__traits.canDelete = false;
                o.data.__traits.canEdit = false;
            }
            arrChildren.push(o);
        }
        return arrChildren;
    }

    /*this.canCreateNode = function(parentType, parentLength, parentClass) {
	console.log('canCreateNode', parentType);
		switch (parentType) {
			case 'object' :
			case 'localsharedobject' : // Root
				return true;
			case 'array' :
				return true;
			case 'vector' :
				switch (parentClass) {
					case 'Number' :
						return true;
					case 'int' :
					case 'uint' :
						return true;
					case 'Object' :
						return true;
					default : // Typed Object
						return true;
				}
				return false;
			case 'dictionary' :
				return true;
			default :
				return false;
		};
		return  false;
	};*/

    function validateData(value, type) {
        if (type == 'Number') value = Number(value);
        if (type == 'Integer') value = parseInt(value);
        if (type == 'String') value = String(value);
        return value;
    }

    this.createNode = function(
        parentType,
        parentLength,
        parentClass,
        label,
        value,
        valueType
    ) {
        var o;
        var indexLabel = String(parentLength);
        if (label == null) label = 'New String';
        if (value == null) value = 'Hello World';
        if (valueType == null) valueType = 'String';
        if (parentType == null) parentType = '';

        if (debug)
            console.log(
                'createNode(',
                parentType,
                parentLength,
                parentClass,
                label,
                value,
                valueType,
                ')'
            );
        switch (parentType.toLowerCase()) {
            case 'object':
            case 'localsharedobject': // Root
                value.value = validateData(value.value, valueType);
                o = getChild(label, value);
                break;
            case 'array':
                value.value = validateData(value.value, valueType);
                // Arrays can act like objects so don't restrict label
                o = getChild(label, value);
                break;
            case 'vector':
                switch (parentClass) {
                    case 'Number':
                        value.value = validateData(value.value, 'Number');
                        o = getChild(indexLabel, value);
                        break;
                    case 'int':
                    case 'uint':
                        value.value = validateData(value.value, 'Integer');
                        o = getChild(indexLabel, value);
                        break;
                    case 'Object':
                        value.value = validateData(value.value, valueType);
                        o = getChild(indexLabel, value);
                        break;
                    default:
                        // Typed Object
                        // TODO: Possibly have it figure out what members in the new object?
                        o = getChild(indexLabel, {
                            value: {},
                            __traits: {
                                type: 'Object',
                                class: parentClass,
                                members: [],
                                count: 0,
                                externalizable: false,
                                dynamic: true,
                            },
                        });
                }
                break;
            case 'dictionary':
                o = getChild(indexLabel, value, String(parentLength + 1));
                break;
            default:
                // Reject
                return 'Can only add new items to objects or at the root level';
        }
        return o;
    };

    // Create ArrayBuffer to save
    this.serialize = function(json, obj, file, onComplete) {
        try {
            var worker = new Worker('js/parsers/SOLWriterWorker.js');
            worker.onmessage = function(e) {
                if (e.data.type == 'debug') {
                    if (debug) console.info(e.data.message);
                    return;
                }
                if (e.data.type == 'warning') {
                    if (debug) console.warn(e.data.message);
                    return;
                }

                onComplete(e.data.data);
            };

            worker.onerror = function(error) {
                console.log('Worker error: ' + error.message + '\n');
                onComplete(
                    {
                        text:
                            'Error saving file:<code>' +
                            error.message +
                            '<br>(' +
                            error.filename +
                            ':' +
                            error.lineno +
                            ')</code>',
                        icon: 'error',
                    },
                    file
                );
            };
            if (debug)
                console.log('post message to worker', json.children, obj);
            worker.postMessage({
                //fileName: file.name,
                //fileName: json.data.value.fileName,
                fileName: obj.__traits.fileName,
                //amfVersion: amfVersion,
                //amfVersion: json.data.value.amfVersion,
                amfVersion: obj.__traits.amfVersion,
                filePath: obj.__traits2 ? obj.__traits2.filePath : null,
                //data: json.children
                data: obj.value,
            });
        } catch (error) {
            console.log('Parser error: ' + error.message + '\n');
            onComplete({ text: 'Error assembling file', icon: 'error' }, file);
        }
    };

    this.obj2Tree = function(data) {
        amfVersion = data.header.amfVersion;

        var json = {
            text: data.fileName,
            icon: 'localsharedobject',
            children: getChildren(data.body, 'lso'),
            //	state: { opened: true, disabled: true },
            state: { opened: true },
            data: {
                __traits: {
                    type: 'localsharedobject',
                    canCreate: true,
                    canRename: false,
                    canDelete: false,
                    canEdit: false,
                },
                value: data.header,
                value2: data.flex,
            },
            li_attr: {
                title: data.header.fileName + ' : AMF' + data.header.amfVersion,
            },
        };
        return json;
    };

    this.deserialize = function(buffer, file, onComplete) {
        var t = this;
        var worker = new Worker('js/parsers/SOLReaderWorker.js');
        worker.onmessage = function(e) {
            if (e.data.type == 'debug') {
                if (debug) console.info(e.data.message);
                return;
            }
            if (e.data.type == 'warning') {
                if (debug) console.warn(e.data.message);
                return;
            }
            if (e.data.type == 'alert') {
                if (debug) console.warn(e.data.message);
                Alert.show(e.data.message, Alert.WARNING);
                return;
            }

            //var idx = e.data.fileID;
            var data = e.data.data;
            data.fileSize = file.size;
            data.fileName = file.name;
            if (debug) console.log('Data', data);

            var json = t.obj2Tree(data);

            onComplete(json, file);
        };

        worker.onerror = function(error) {
            console.error(
                'Worker ' +
                    error.message +
                    '  (' +
                    error.filename +
                    ':' +
                    error.lineno +
                    ')'
            );
            Alert.show(
                'Error reading file:<code>' +
                    error.message +
                    '<br>(' +
                    error.filename +
                    ':' +
                    error.lineno +
                    ')</code>',
                Alert.ERROR
            );
            onComplete({ text: 'Error reading file', icon: 'error' }, file);
        };

        worker.postMessage({
            text: buffer,
            fileID: 0,
        });
    };
};
