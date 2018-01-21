var DictionaryView = function() {
	/////////////////
	// Constructor //
	/////////////////
	function init(el/*:Element */, node/*:Object */, input/*:Object */, callBack/*:Function */)/*:void */ {
		// Generate HTML
		el.html('<h1>Dictionary</h1><div></div>' + googlead);
		
		// Add view class for styling
		el.addClass('DictionaryType');
		
		// Generate details
		if (debug) console.log(node);
		
		var str = '';
		if (node.data.__traits.hasOwnProperty('weakKeys')) str += '<p><strong>Weak Keys:</strong> <span>' + node.data.__traits.weakKeys + '</span></p>';
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