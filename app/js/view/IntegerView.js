var IntegerView = function() {
    /////////////////
    // Constructor //
    /////////////////
    function init(
        el /*:Element */,
        node /*:Object */,
        input /*:Number */,
        callBack /*:Function */
    ) /*:void */ {
        // Generate HTML
        var strHTML =
            '<h1>Integer</h1>' +
            '<p class="description">An Integer data type represents a 32-bit signed number. The range of values represented by an Integer is -2,147,483,648 (-2^31) to 2,147,483,647 (2^31-1).</p>' +
            '<div class="field">' +
            '<input id="IntegerValue" type="text">' +
            '<span class="right-circled-icon icon"></span>' +
            '</div>';
        el.html(strHTML);

        // Add view class for styling
        el.addClass('IntegerType');

        // Generate details
        var elValue = el.find('input');

        // Restrict key input
        elValue.on('keydown', function(
            event /*:KeyboardEvent */
        ) /*:Boolean */ {
            var c = event.which ? event.which : event.keyCode;
            // Keypad
            if (c >= 96 && c <= 105) return true;
            // Number row
            if (c >= 48 && c <= 57) return true;
            // Arrow/Home/End Keys
            if (c >= 35 && c <= 40) return true;
            // Delete/Backspace/Negative Keys
            if (c == 46 || c == 8 || c == 109) return true;
            return false;
        });

        // Save the value when the input changes
        elValue.on('input propertychange', function() /*:void */ {
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
        input = parseInt(input);
        if (isNaN(parseInt(input))) input = 0;
        return input;
    }

    function validate(input /*:Number/String */) /*:Boolean */ {
        // Input starts from raw as a number, but jQuery returns a string
        var outOfBounds = input < -2147483648 || input > 2147483647;
        return (
            !isNaN(parseInt(input)) &&
            !outOfBounds &&
            String(input).split('.').length - 1 == 0 &&
            String(input).split('-').length - 1 <= 1
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
