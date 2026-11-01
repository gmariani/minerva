import $ from 'jquery';
import { util } from '../util.js';

// An object that contains itself (a circular AMF reference), which can't be expanded into the tree
var ReferenceView = function() {
    /////////////////
    // Constructor //
    /////////////////
    function init(el /*:Element */, node /*:Object */, goToTarget /*:Function */) /*:void */ {
        el.html(
            '<h1>Reference</h1>' +
                '<p>This is <strong>' +
                util.htmlEntities(node.data.path) +
                '</strong> itself: the object contains itself, so it can\'t be shown again here.</p>' +
                '<input type="button" class="send" value="Go to original">'
        );

        // Add view class for styling
        el.addClass('ReferenceType');

        el.find('input').on('click', function() {
            goToTarget(node.data.value);
        });
    }

    // Clear values and clear elements
    function reset() /*:void */ {}

    ////////////
    // Public //
    ////////////
    this.init = init;
    this.reset = reset;
};

export default ReferenceView;
