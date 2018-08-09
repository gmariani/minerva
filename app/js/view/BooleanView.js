var BooleanView = function() {
    /////////////////
    // Constructor //
    /////////////////
    function init(
        el /*:Element */,
        node /*:Object */,
        input /*:Array */,
        callBack /*:Function */
    ) /*:void */ {
        // Generate HTML
        var strHTML =
            '<h1>Boolean</h1>' +
            '<div class="field">' +
            '<div class="slide-chk">' +
            '<input id="BooleanValue" type="checkbox">' +
            '<label for="BooleanValue"></label>' +
            '</div>' +
            '</div>';
        el.html(strHTML);

        // Add view class for styling
        el.addClass('BooleanType');

        // Generate details
        var elValue = el.find('input');

        // Save the value when the checkbox changes
        elValue.on('change', function() {
            var val = elValue.prop('checked') ? 1 : 0;
            if (
                node.data.__traits.origType == 'True' ||
                node.data.__traits.origType == 'False'
            ) {
                node.data.__traits.origType = val ? 'True' : 'False';
                node.li_attr.title = val ? 'True' : 'False';
            }

            callBack(val, node);
        });

        // Sanitize
        if (!validate(input)) input = false;
        elValue.prop('checked', input);
    }

    function validate(input /*:Boolean */) /*:Boolean */ {
        return 1 === input || 0 === input;
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
