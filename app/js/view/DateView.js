var DateView = function() {
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
            '<h1>Date</h1>' +
            '<div class="field">' +
            '<input type="text" id="DateValue"/>' +
            '<span class="right-circled-icon icon"></span>' +
            '</div>' +
            '<p class="description"></p>';
        el.html(strHTML);

        // Add view class for styling
        el.addClass('DateType');

        // Generate details
        var d = typeof input == 'string' ? new Date(input) : input,
            elDifference = el.children('p'),
            elValue = el.find('input');

        elValue.datetimepicker({
            timeFormat: 'HH:mm:ss.l z',
            onSelect: function() {
                elDifference.html($.timeago(elValue.datetimepicker('getDate')));
                callBack(elValue.datetimepicker('getDate'), node);
            },
        });
        elValue.datetimepicker('setDate', d);

        elDifference.html($.timeago(d));
    }

    function validate(input /*:String */) /*:void */ {
        return !isNaN(Date.parse(input));
    }

    // Clear values and clear elements
    function reset() /*:void */ {
        //elValue.datetimepicker("destroy");
    }

    ////////////
    // Public //
    ////////////
    this.init = init;
    this.validate = validate;
    this.reset = reset;
};
