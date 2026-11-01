// jQuery UI and some jQuery plugins attach to the global jQuery rather than importing it,
// so it has to be exposed before they load.
import $ from 'jquery';

window.$ = window.jQuery = $;

export default $;
