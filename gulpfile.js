var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
const eslint = require('gulp-eslint');

gulp.task('start', function() {
  nodemon({
    script: 'app.js',
    ext: 'js html',
    env: { NODE_ENV: 'development', NETWORK_ID: 3 }
  });
});

gulp.task('start:local', function() {
  nodemon({
    script: 'app.js',
    ext: 'js html',
    env: { NODE_ENV: 'e3', WEB3_PROVIDER: 'http://localhost:8545', WEB3_WS_PROVIDER: 'ws://localhost:8545', NETWORK_ID: 101 }
  });
});

gulp.task('lint', () => {
  return gulp
    .src(['**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

function isFixed(file) {
  return file.eslint && typeof file.eslint.output === 'string';
}

gulp.task('lint:fix', () => {
  return gulp
    .src(['**/*.js', '!node_modules/**'])
    .pipe(eslint({ fix: true }))
    .pipe(eslint.format())
    .pipe(gulp.dest('.'))
    .pipe(eslint.failAfterError());
});
