var through = require('through2'),
	cheerio = require('cheerio'),
	uglifyjs = require('uglify-js'),
	cleancss = require('clean-css'),
	gutil = require('gulp-util');

const PLUGIN_NAME = 'gulp-minify-inline';

module.exports = function ( opt )
{
	opt = opt || {};

	function minify ( file, encoding, callback )
	{
		if (file.isNull())
		{
			return callback(null, file);
		}

		if (file.isStream())
		{
			return callback(new gutil.PluginError('gulp-minify-inline', 'doesn\'t support Streams'));
		}

		var $ = cheerio.load(file.contents.toString(), {decodeEntities: false});

		var has_done_nothing = true;

		var jsSelector = opt.jsSelector || 'script';

		if (opt.js !== false) $(jsSelector).each(function ( )
		{
			if (!opt.js) opt.js = {};
			if (!opt.js.output) opt.js.output = {};

			// Default js.output.inline_script to 'true'
			if (typeof opt.js.output.inline_script == 'undefined') opt.js.output.inline_script = true;

			opt.js.fromString = true;

			var $this = $(this),
				script_orig = $this.text().trim();

			if (script_orig !== '')
			{
				var script_min = uglifyjs.minify(script_orig, opt.js);

				$this.text(script_min.code);

				has_done_nothing = false;
			}
		});

		var cssSelector = opt.cssSelector || 'style';

		if (opt.css !== false) $(cssSelector).each(function ( )
		{
			var $this = $(this),
				style_orig = $this.text().trim();

			if (style_orig !== '')
			{
				var style_min = new cleancss(opt.css).minify(style_orig).styles;

				$this.text(style_min);

				has_done_nothing = false;
			}
		});

		if (!has_done_nothing) file.contents = new Buffer($.html());

		callback(null, file);
	}

	return through.obj(minify);
};
