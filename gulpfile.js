var gulp = require('gulp');
var concat = require('gulp-concat');
var less = require('gulp-less');
var sass = require('gulp-sass');

var paths = {
    scripts: ['app/**/*.js'],
    styles: ['app/css/style.less'],
    sass : ['./assets/scss/*.scss','assets/scss/**/*.scss'] 
};

gulp.task('scripts', function() {
    // concat and copy all JavaScript
    return gulp.src(paths.scripts)
        .pipe(concat('taba.js'))
        .pipe(gulp.dest('dist/js'));
});

gulp.task('styles', function() {
    return gulp.src(paths.styles)
        .pipe(less())
        .pipe(gulp.dest('dist/css'));
})

gulp.task('sass', function(){
  return gulp.src('./assets/scss/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./assets/css/'))
})

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['scripts', 'sass']); 

gulp.task('watch', function() {
  gulp.watch(paths.scripts, ['scripts']);
  gulp.watch(paths.sass, ['sass']);
});