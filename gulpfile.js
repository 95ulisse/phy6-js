'use strict';

var path = require('path'),
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    eslint = require('gulp-eslint'),
    webpack = require('webpack'),
    WebpackDevServer = require('webpack-dev-server');

var webpackConfig = require('./webpack.config');

// Default task
gulp.task('default', [ 'build' ]);

// -----------------------------------------------------------
// Main tasks
// -----------------------------------------------------------

gulp.task('lint', function () {
    return gulp.src(['./src/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('test', [], function () {

    // Debug mode specific settings
    const port = 8080;
    webpackConfig.debug = true;
    webpackConfig.devtool = 'inline-source-map';

    // Starts the dev server
    new WebpackDevServer(webpack(webpackConfig), {
        contentBase: path.join(__dirname, 'test'),
        stats: { colors: true }
    })
    .listen(port, 'localhost', function (e) {
        if (e)
            throw new gutil.PluginError('WebpackDevServer', e.message);
        gutil.log('[WebpackDevServer]', `Listening on port ${port}`);
    });

});
