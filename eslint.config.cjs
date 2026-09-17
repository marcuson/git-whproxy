const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    ignores: ['coverage/**', 'docs/**'],
  },
  {
    ...prettierRecommended,
    files: ['src/**/*.js', 'test/**/*.js'],
  },
];
