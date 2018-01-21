// Base64 Conversion //
// https://developer.mozilla.org/en-US/docs/Web/API/Window.btoa
// IE10+

// URI Conversion //
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI

// http://codebeautify.org/binary-string-converter

var StringView = function() {
	var elValue,
		elAlgorithm,
		elEncType,
		inputDelay = false;
		
	/////////////////
	// Constructor //
	/////////////////
	function init(el/*:Element */, node/*:Object */, input/*:String */, callBack/*:Function */)/*:void */ {
		// Generate HTML
		var strHTML = 	'<h1>String</h1>' +
						'<nav>' + 
							'<div class="field">' +
								'<select id="StringAlgorithm" class="grayed no-icon">' +
									'<option value="html">HTML</option>' +
									'<!--<option value="uriASCII">URL ASCII</option>-->' +
									'<option value="uriUTF8">URL</option>' +
									'<!--<option value="b64ASCII">Base64 ASCII</option>-->' +
									'<option value="b64UTF8">Base64</option>' +
									'<option value="hex">Hex</option>' +
									'<option value="binary">Binary</option>' +
								'</select>' +
								'<div class="arrow-select"></div>' +
								'<svg class="arrow-select-svg"/>' +
							'</div>' +
							'<input type="button" id="btnDecode" name="btnDecode" class="send" value="Decode">' +
							'<input type="button" id="btnEncode" name="btnEncode" class="send" value="Encode">' +
						'</nav>' +
						'<p><strong>Possible Encoding:</strong> <span id="encodingType"></span></p>' +
						'<div class="field">' +
							'<textarea id="StringValue"  class="message" ></textarea>' +
							'<span class="entypo-comment icon"></span>' +
						'</div>' + 
						googlead;

		el.html(strHTML);
		
		// Add view class for styling
		el.addClass('StringType');
		
		// Generate details
		elValue = el.find('textarea');
		elAlgorithm = el.find('select');
		elEncType = el.find('#encodingType');
		
		// Update display when checkbox/combobox changes
		el.find('nav > input').first().on('click', { callBack:callBack, node:node }, decode);
		el.find('nav > input').last().on('click', { callBack:callBack, node:node }, encode);

		// Validate the input as it's typed
		elValue.on('input propertychange', function(event/*:KeyBoardEvent */)/*:void */ {
			if (inputDelay) clearTimeout(inputDelay);
			inputDelay = setTimeout(function () {
				// For now we save after each input
				if (validate(elValue.val()) && callBack) callBack(elValue.val(), node);
			});
		});
	
		elValue.val(input);
		elEncType.html(getEncType(input));
	}
	
	function validate(input/*:String */)/*:void */ {
		return (typeof input == 'string');
	}
	
	// Clear values and clear elements
	function reset()/*:void */ {
		if (inputDelay) clearTimeout(inputDelay);
		elEncodeValue= elAlgorithm = elEncType = elResult = elValue = null;
	}

	// Encode the string source into the display
	function encode() {
		var str = elValue.val();
		switch (elAlgorithm.val()) {
			case 'b64ASCII' :
				str = btoa(str);
				break;
			case 'b64UTF8' :
				//str = btoa(encodeURIComponent(escape(str)));
				str = btoa(encodeURIComponent(str));
				break;
			case 'uriASCII' :
				str = encodeURI(escape(str));
				break;
			case 'uriUTF8' :
			//	str = encodeURIComponent(escape(str));
				str = encodeURIComponent(str);
				break;
			case 'html' :
				str = $('<div/>').text(str).html();
				break;
			case 'hex' :
				var hex = '';
				for (var i = 0; i < str.length; i++) {
					hex += '' + str.charCodeAt(i).toString(16);
				}
				str = hex;
				break;
			case 'binary' :
				var arr = [];
				var data = "";
				function padding_left(s,c,n){
					if(!s||!c||s.length>=n){return s;}
					var max=(n- s.length)/c.length;for(var i=0;i<max;i++){s=c+ s;}
					return s;
				}
				
				for (var i = 0; i < str.length; i++) {
					arr.push(str[i].charCodeAt(0).toString(2));
				}
				for (var j = 0; j < arr.length; j++) {
					var pad = padding_left(arr[j], '0', 8);
					data += pad;// + ' ';
				}
				str = data;
				break;
		}
		if (debug) console.log('encode', str);
		elValue.val(str);
		elEncType.html(getEncType(str));
	}
	
	// Decode the string source into the display
	function decode() {
		var str = elValue.val();
		try {
			switch (elAlgorithm.val()) {
				case 'b64ASCII' :
					// Requires proper encoding or an error is generated
					str = atob(str);
					break;
				case 'b64UTF8' :
				//	str = unescape(decodeURIComponent(atob(str)));
					str = decodeURIComponent(atob(str));
					break;
				case 'uriASCII' :
					str = unescape(decodeURI(str));
					break;
				case 'uriUTF8' :
					//str = unescape(decodeURIComponent(str));
					str = decodeURIComponent(str);
					break;
				case 'html' :
					str = $('<div/>').html(str).text();
					break;
				case 'hex' :
					var str2 = '';
					for (var i = 0; i < str.length; i+=2) {
						str2 += String.fromCharCode(parseInt(str.substr(i, 2),16));
					}
					str = str2;
					break;
				case 'binary' :
					str = str.replace(/\s/g,"");
					var data = "";
					if (str.length % 8 != 0) {
						data = "?";
					} else {
						while(str.length > 0) {
							var first8 = str.substring(0, 8);
							str = str.substring(8);
							data += String.fromCharCode(parseInt(first8, 2));
						}
					}
					str = data;
					break;
			}
		} catch (err) {
			str = err.message;
		}
		if (debug) console.log('decode', str);
		elValue.val(str);
		elEncType.html(getEncType(str));
	};
	
	function getEncType(str) {
		var msg = [];
		if (isURL(str)) msg.push('URL');
		if (isB64(str)) msg.push('Base64');
		if (isHex(str)) msg.push('Hex');
		if (isBinary(str)) msg.push('Binary');
		return msg.length == 0 ? 'None' : msg.join(',');
	};
	
	function isB64(str) {
		var re = new RegExp("^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$");
		return re.test(str);
	}
	
	function isBinary(str) {
		var re = new RegExp("^[01]+$");
		return re.test(str);
	}
	
	function isHex(str) {
		var re = new RegExp("^[0-9abcdefABCDEF]+$");
		return re.test(str);
	}
	
	function isURL(str) {
		var test = decodeURIComponent(str);
		return test != str;
	}
	
	////////////
	// Public //
	////////////
	this.init = init;
	this.validate = validate;
	this.reset = reset;
};