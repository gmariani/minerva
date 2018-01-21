var ObjectView = function() {
	/////////////////
	// Constructor //
	/////////////////
	function init(el/*:Element */, node/*:Object */, input/*:Object */, callBack/*:Function */)/*:void */ {
		// Generate HTML
		el.html('<h1>Object</h1><div></div>' + googlead);
		
		// Add view class for styling
		el.addClass('ObjectType');
		
		// Generate details
		if (debug) console.log('ObjectView', node, input);
		
		var str = '';
		// AMF0 standard object doesn't have class
		if (node.data.__traits.hasOwnProperty('class')) str += '<p><strong>Class:</strong> <code>' + node.data.__traits.class + '</code></p>';
		// AMF3 and up
		if (node.data.__traits.hasOwnProperty('dynamic')) {
			str += '<p><strong>Is Dynamic?</strong> <span>' + node.data.__traits.dynamic + '</span></p>';
			/*str += 	'<p><strong>Is Dynamic?</strong></p>'+
					'<div class="field clearfix">' +
						'<div class="slide-chk">' +
							'<input id="DynamicValue" type="checkbox">' +
							'<label for="DynamicValue"></label>' +
						'</div>' +
					'</div>';*/
		}
		if (node.data.__traits.hasOwnProperty('externalizable')) {
			str += '<p><strong>Is Externalizable:</strong> <span>' + node.data.__traits.externalizable + '</span></p>';
			/*str += 	'<p><strong>Is Externalizable?</strong></p>'+
					'<div class="field clearfix">' +
						'<div class="slide-chk">' +
							'<input id="ExternalValue" type="checkbox">' +
							'<label for="ExternalValue"></label>' +
						'</div>' +
					'</div>';*/
		}
		if (node.data.__traits.hasOwnProperty('count')) str += '<p><strong>Member Count:</strong> ' + node.data.__traits.count + '</p>';
		if (node.data.__traits.hasOwnProperty('members')) str += '<p><strong>Members:</strong> <code>' + JSON.stringify(node.data.__traits.members, null, '\t') + '</code></p>';
		// Don't display JSON until we can verify the child nodes are editing the same object as parent
		// Otherwise, the data displayed here is not updated when a child is updated
		/*str += '<p><strong>JSON:</strong> ';
		try {
			str += JSON.stringify(input, null, '\t');
		} catch (err) {
			str += err.message;
		}
		str += '</p>';*/
		el.children('div').html(str);

	}
	
	function validate(input/*:Object */)/*:void */ {
		return (typeof input == 'Object');
	}
	
	// Clear values and clear elements
	function reset()/*:void */ { }
	
	////////////
	// Public //
	////////////
	this.init = init;
	this.validate = validate;
	this.reset = reset;
};