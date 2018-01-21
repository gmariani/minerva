/* jshint node: true */
var gulp		= require('gulp');
var useref		= require('gulp-useref');
var uglify		= require('gulp-uglify');
var gulpIf		= require('gulp-if');
var cssnano		= require('gulp-cssnano');
var imagemin	= require('gulp-imagemin');
var cache 		= require('gulp-cache');
var del 		= require('del');
var runSequence = require('run-sequence');
var replace 	= require('gulp-replace');
var gulpUtil 	= require('gulp-util');
var minifyInline = require('gulp-minify-inline');

// empty dist folder
gulp.task('clean:dist', function() {
	return del.sync('dist');
});

// Copy other php files over to dist except for index.php
gulp.task('base', function() {
	return gulp.src(['app/favicon.ico', 'app/browserconfig.xml', 'app/manifest.appcache'])
		.pipe(gulp.dest('dist'));
});

// Minify inline css and js
/*gulp.task('base2', function() {
	return gulp.src(['app/login.php'])
		.pipe(minifyInline())
		.pipe(gulp.dest('dist'))
});*/

// Concat/minify CSS and JS, copy to dist
gulp.task('useref', function() {
	return gulp.src(['app/index.html'])
		.pipe(useref({ }))
		// Minifies only if it's a JavaScript file
		.pipe(gulpIf('*.js', uglify().on('error', gulpUtil.log)))
		// Minifies only if it's a CSS file
		.pipe(gulpIf('*.css', cssnano()))
		.pipe(gulp.dest('dist'));
});

// Add base flickr directory to css and js paths
gulp.task('fix-index', function(){
	gulp.src(['dist/index.php'])
		.pipe(replace('css/styles.min.css', '/projects/minerva/css/styles.min.css'))
		.pipe(replace('js/main.min.js', '/projects/minerva/js/main.min.js'))
		
		.pipe(replace('.min.js"></script>', '.min.js" async></script>'))
		.pipe(replace('.min.css">', '.min.css" media="screen">'))
		.pipe(gulp.dest('dist'));
});

// Copy images, optimize them, and cache the optimized images so
// it doesn't have to run lots of times
gulp.task('images', function(){
	return gulp.src('app/img/**/*.+(png|jpg|gif|svg)')
		.pipe(cache(imagemin()))
		.pipe(gulp.dest('dist/img'));
});

// Copy fonts over to dist
gulp.task('fonts', function() {
	return gulp.src('app/fonts/**/*')
		.pipe(gulp.dest('dist/fonts'));
});

// Run above tasks in sequence
gulp.task('build', function (callback) {
	runSequence('clean:dist', ['base', 'useref', 'images'], 'fix-index', callback);
});

// Empty cached images from gulp-cache
gulp.task('cache:clear', function (callback) {
	return cache.clearAll(callback);
});