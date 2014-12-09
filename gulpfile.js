/*
 * MutsNeedlePlot
 * https://github.com/bbglab/muts-needle-plot
 *
 */


// packages
var gulp   = require('gulp');
var concat = require('gulp-concat');

// browser builds
var browserify = require('browserify');
var watchify = require('watchify')
var uglify = require('gulp-uglify');

// css
var minifyCSS = require('gulp-minify-css');


// code style 

// gulp helper
var source = require('vinyl-source-stream'); // converts node streams into vinyl streams
var gzip = require('gulp-gzip');
var rename = require('gulp-rename');
var chmod = require('gulp-chmod');
var streamify = require('gulp-streamify'); // converts streams into buffers (legacy support for old plugins)
var watch = require('gulp-watch');

// path tools
var fs = require('fs');
var path = require('path');
var join = path.join;
var mkdirp = require('mkdirp');
var del = require('del');

// auto config & browserify build config
var packageConfig = require('./package.json');
var version = packageConfig.version;

var buildDir = "build";
var outputFile = "muts-needle-plot";
var outputFileMin = join(buildDir,outputFile + ".min.js");

// a failing test breaks the whole build chain
gulp.task('build', ['build-browser', 'build-browser-gzip', 'build-css', 'build-min-css']);
gulp.task('default', [  'build']);

// will remove everything in build
gulp.task('clean', function(cb) {
  del([buildDir], cb);
});

// just makes sure that the build dir exists
gulp.task('init', ['clean'], function() {
  mkdirp(buildDir, function (err) {
    if (err) console.error(err)
  });
});

// build css
gulp.task('build-css',['init'], function () {
    return gulp.src('./src/css/*.css')
      .pipe(concat(outputFile + '.css'))
      .pipe(chmod(644))
      .pipe(gulp.dest(buildDir));
});

// build css-min
gulp.task('build-min-css',['build-css'], function () {
   return gulp.src(join(buildDir, outputFile + '.css'))
   .pipe(minifyCSS())
   .pipe(rename(outputFile + '.min.css'))
   .pipe(chmod(644))
   .pipe(gulp.dest(buildDir));
});


// browserify debug
gulp.task('build-browser',['init'], function() {
  var b = browserify({debug: true,hasExports: true});
  exposeBundles(b);
  return b.bundle()
    .pipe(source(outputFile + ".js"))
    .pipe(chmod(644))
    .pipe(gulp.dest(buildDir));
});

// browserify min
gulp.task('build-browser-min',['init'], function() {
  var b = browserify({hasExports: true, standalone: "muts-needle-plot"});
  exposeBundles(b);
  return b.bundle()
    .pipe(source(outputFile + ".min.js"))
    .pipe(chmod(644))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest(buildDir));
});

// browserify gzip 
gulp.task('build-browser-gzip', ['build-browser-min'], function() {
  return gulp.src(outputFileMin)
    .pipe(gzip({append: false, gzipOptions: { level: 9 }}))
    .pipe(rename(outputFile + ".min.gz.js"))
    .pipe(gulp.dest(buildDir));
});

// exposes the main package
// + checks the config whether it should expose other packages
function exposeBundles(b){
  b.add('./index.js', {expose: packageConfig.name });
  if(packageConfig.sniper !== undefined && packageConfig.sniper.exposed !== undefined){
    for(var i=0; i<packageConfig.sniper.exposed.length; i++){
      b.require(packageConfig.sniper.exposed[i]);
    }
  }
}

// watch task for browserify 
// watchify has an internal cache -> subsequent builds are faster
gulp.task('watch', function() {
  var util = require('gulp-util')

  var b = browserify({debug: true,hasExports: true, cache: {}, packageCache: {} });
  b.add('./index.js', {expose: packageConfig.name});
  exposeBundles(b);

  function rebundle(ids){
    b.bundle()
    .on("error", function(error) {
      util.log(util.colors.red("Error: "), error);
     })
    .pipe(source(outputFile + ".js"))
    .pipe(chmod(644))
    .pipe(gulp.dest(buildDir));
  }

  var watcher = watchify(b);
  watcher.on("update", rebundle)
   .on("log", function(message) {
      util.log("Refreshed:", message);
  });
  return rebundle();
});
