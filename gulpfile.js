const { src, dest, series, watch } = require('gulp');
const del = require('delete');

function clean() {
  return del.promise('dist');
}

function copy() {
  return src('src/**').pipe(dest('dist'));
}

function watchChange() {
  watch('src/**', copy);
}

const build = series(clean, copy);

const dev = series(clean, copy, watchChange);

exports.build = build;
exports.dev = dev;
exports.default = build;
