var DictionaryItemView = function() {
	
	/////////////////
	// Constructor //
	/////////////////
	function init(el/*:Element */, node/*:Object */, input/*:Object */, callBack/*:Function */)/*:void */ {
		// Generate HTML
		var strHTML = 	'<h1>Dictionary Item</h1>' +
						'<div></div>' + 
						googlead;
		el.html(strHTML);
		
		// Add view class for styling
		el.addClass('DictionaryItemType');
		
		// Generate details
		if (debug) console.log(node, input);
		var key = node.data.value.key.__traits;
		var val = node.data.value.value.__traits;
		var str = '';
		str += '<p><strong>Key:</strong> ' + key.type + (key.class ? ' : ' + key.class : '') + '</p>';
		str += '<p><strong>Value:</strong> ' + val.type + '</p>';

		el.children('div').html(str);
	};
	
	function validate(input/*:Object */)/*:void */ {
		return (typeof input == 'Object');
	};
	
	// Clear values and clear elements
	function reset()/*:void */ { };
	
	////////////
	// Public //
	////////////
	this.init = init;
	this.validate = validate;
	this.reset = reset;
};