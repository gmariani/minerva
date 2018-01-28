var ArrayView = function() {
    /////////////////
    // Constructor //
    /////////////////
    function init(el /*:Element */, node /*:Object */) /*:void */ {
        // Generate HTML
        el.html('<h1>Array</h1><div></div>');

        // Add view class for styling
        el.addClass('ArrayType');

        // Generate details
        var str = '';
        // Used to be input.length, but when we switched it from an array to an object for ECMAArrays, we lost the length.
        // Instead using the jstree's child node length
        str += '<p><strong>Children:</strong> ' + node.children.length + '</p>';
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

    function validate(input /*:Array */) /*:void */ {
        return (
            typeof input == 'object' &&
            Object.prototype.toString.call(input) === '[object Array]'
        );
    }

    // Clear values and clear elements
    function reset() /*:void */ {}

    ////////////
    // Public //
    ////////////
    this.init = init;
    this.validate = validate;
    this.reset = reset;
};
