var XMLView = function() {
    var elError,
        inputDelay = false;

    /////////////////
    // Constructor //
    /////////////////
    function init(
        el /*:Element */,
        node /*:Object */,
        input /*:String */,
        callBack /*:Function */
    ) /*:void */ {
        // Generate HTML
        var strHTML =
            '<h1>XML</h1>' +
            '<div class="field">' +
            '<textarea id="XMLValue" rows="20" cols="50" class="message" ></textarea>' +
            '<span class="comment-icon icon"></span>' +
            '</div>' +
            '<pre class="XMLError" ></pre>';
        el.html(strHTML);

        // Add view class for styling
        el.addClass('XMLType');

        // Generate details
        var elValue = el.find('textarea');
        elError = el.children('.XMLError');

        // Validate the input as it's typed
        elValue.on('input propertychange', function() /*:void */ {
            if (inputDelay) clearTimeout(inputDelay);
            inputDelay = setTimeout(function() {
                // For now we save after each input
                if (validate(elValue.val())) {
                    elValue.removeClass('error');
                    if (callBack) callBack(elValue.val(), node);
                } else {
                    elValue.addClass('error');
                }
            });
        });

        elValue.val(input);
        validate(input);
    }

    // http://www.w3schools.com/xml/validator.asp
    function validate(input /*:String */) /*:void */ {
        var xmlParser = new DOMParser(),
            dom = xmlParser.parseFromString(input, 'text/xml');

        if (dom.documentElement.nodeName == 'parsererror') {
            var xmlString = new XMLSerializer().serializeToString(
                dom.documentElement
            );

            // Remove parsererror tags
            xmlString = xmlString.replace(/<parsererror[^>]+>/g, '');
            xmlString = xmlString.replace('</parsererror>', '');

            // Break source text into new line
            xmlString = xmlString.replace('<sourcetext>', '<br>');

            elError.html(xmlString);
            return false;
        } else {
            elError.html('XML is valid');
            return true;
        }
    }

    // Clear values and clear elements
    function reset() /*:void */ {
        if (inputDelay) clearTimeout(inputDelay);
        elError = null;
    }

    ////////////
    // Public //
    ////////////
    this.init = init;
    this.validate = validate;
    this.reset = reset;
};
