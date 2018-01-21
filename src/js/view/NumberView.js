var NumberView = function() {
	/////////////////
	// Constructor //
	/////////////////
	function init(el/*:Element */, node/*:Object */, input/*:Number */, callBack/*:Function */)/*:void */ {
		// Generate HTML
		var strHTML = 	'<h1>Number</h1>' +
						'<div class="field">' +
							'<input type="text" id="NumberValue">' +
							'<span class="entypo-right-circled icon"></span>' +
						'</div>' + 
						googlead;
		el.html(strHTML);
		
		// Add view class for styling
		el.addClass('NumberType');
		
		// Generate details
		var elValue = el.find('input');
		
		// Restrict key input
		elValue.on('keydown', function(event/*:KeyboardEvent */)/*:Boolean */ {
			var c = (event.which) ? event.which : event.keyCode;
			// Keypad
			if (c >= 97 && c <= 105) return true;
			// Number row
			if (c >= 48 && c <= 57) return true;
			// Arrow/Home/End Keys
			if (c >= 35 && c <= 40) return true;
			// Delete/Backspace/Negative Keys
			if (c == 46 || c == 8 || c == 109) return true;
			// Decimal/Period Keys
			if (c == 110 || c == 190) return true;
			return false;
		});
		
		// Save the value when the input changes
		elValue.on('input propertychange', function(event/*:KeyboardEvent */)/*:void */ {
			if (validate(elValue.val())) {
				elValue.removeClass('error');
				callBack(sanitize(elValue.val()), node);
			} else {
				elValue.addClass('error');
			}
		});
		
		elValue.val(sanitize(input));
	}
	
	function sanitize(input) {
		// Return value back to Number
		input = parseFloat(input);
		if (isNaN(input)) input = 0;
		return input;
	}
	
	function validate(input/*:Number/String */)/*:Boolean */ {
		var outOfBounds = (input < Number.MIN_VALUE || input > Number.MAX_VALUE);
		// Input starts from raw as a number, but jQuery returns a string
		return (!isNaN(parseFloat(input)) && !outOfBounds && (String(input).split('.').length - 1) <= 1 && (String(input).split('-').length - 1) <= 1);
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