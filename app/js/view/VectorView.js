/* global debug */
var VectorView = function() {
    /////////////////
    // Constructor //
    /////////////////
    function init(el /*:Element */, node /*:Object */) /*:void */ {
        // Generate HTML
        el.html('<h1>Vector</h1><div></div>');

        // Add view class for styling
        el.addClass('VectorType');

        // Generate details
        if (debug) console.log(node.data);
        var str =
            '<p><strong>Class:</strong> <code>' +
            node.data.__traits.class +
            '</code></p>';
        if (node.data.__traits.hasOwnProperty('fixed'))
            str +=
                '<p><strong>Is Fixed?</strong> <span>' +
                node.data.__traits.fixed +
                '</span></p>';
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
        el
            .children('h1')
            .html('Vector.&lt;' + node.data.__traits.class + '&gt;');
    }

    function validate(input /*:Array */) /*:void */ {
        return typeof input == 'object';
    }

    // Clear value
    function reset() /*:void */ {}

    ////////////
    // Public //
    ////////////
    this.init = init;
    this.validate = validate;
    this.reset = reset;
};
