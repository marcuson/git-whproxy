import { describe, expect, test } from '@jest/globals';
import { wildcardMatch } from '../../src/util.js';

describe('wildcardMatch', () => {
  test.each([
    ['v*.*.*', 'v0.12.1', true],
    ['v*.*.*', 'main', false],
    ['v*', 'v', true],
    ['*', '', true],
    ['v?', 'v1', true],
    ['v?', 'v', false],
    ['v?', 'v12', false],
    ['release', 'ReLeAsE', true],
    ['main', 'prefix-main', false],
    ['main', 'main-suffix', false],
    ['', '', true],
    ['', 'main', false],
    ['v1.2.3', 'v1x2x3', false],
    ['file[1]', 'file1', false],
    ['a+b', 'aaab', false],
  ])('%j matches %j: %s', (pattern, value, expected) => {
    expect(wildcardMatch(pattern, value)).toBe(expected);
  });

  test.each(['.', '+', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'])(
    'treats %j as a literal rather than regex syntax',
    (character) => {
      expect(wildcardMatch(`a${character}b`, `a${character}b`)).toBe(true);
      expect(wildcardMatch(`a${character}b`, 'axb')).toBe(false);
    },
  );
});
