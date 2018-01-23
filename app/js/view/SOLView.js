var SOLView = function() {
    /////////////////
    // Constructor //
    /////////////////
    function init(
        el /*:Element */,
        node /*:Object */,
        fileData /*:Object */,
        solData /*:Object */,
        flexData /*:Object */
    ) /*:void */ {
        // Generate HTML
        el.html('<h1>' + escape(fileData.name) + '</h1><div></div>' + googlead);

        // Add view class for styling
        el.addClass('ObjectType');

        // Generate details
        if (debug) console.log('ObjectView', node, fileData, solData, flexData);

        var options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZoneName: 'short',
            timeZone: 'UTC',
        };
        var str = '';
        str += '<h3>File</h3>';
        str +=
            '<p><strong>File Path:</strong> <code>' +
            escape(fileData.name) +
            '</code><br>';
        str +=
            '<strong>File Size:</strong> <code>' +
            util.formatSize(fileData.size) +
            '</code><br>';
        str +=
            '<strong>Last Modified:</strong> <code>' +
            (fileData.lastModifiedDate
                ? fileData.lastModifiedDate.toLocaleDateString('en-US', options)
                : 'n/a') +
            '</code></p>';

        str += '<h3>Local Shared Object</h3>';
        str +=
            '<p><strong>Name:</strong> <code>' +
            escape(solData.fileName) +
            '</code><br>';
        str +=
            '<strong>AMF Version:</strong> <code>' +
            solData.amfVersion +
            '</code><br>';
        str +=
            '<strong>Tag Size:</strong> <code>' +
            util.formatSize(solData.contentLength) +
            '</code></p>';

        if (flexData) {
            str += '<h3>Unknown Data</h3>';
            str +=
                '<p><strong>Local Shared Object Path:</strong> <code>' +
                flexData.filePath +
                '</code><br>';
            str +=
                '<strong>Tag Size:</strong> <code>' +
                util.formatSize(flexData.header.contentLength) +
                '</code></p>';
        }

        el.children('div').html(str);
    }

    function validate(input /*:Object */) /*:void */ {
        return typeof input == 'Object';
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
