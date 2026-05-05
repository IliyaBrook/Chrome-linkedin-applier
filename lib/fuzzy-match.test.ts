import { describe, expect, it } from 'vitest';
import {
  calculateSimilarity,
  findBestMatch,
  findClosestField,
  jaroWinkler,
  levenshteinDistance,
  ngramSimilarity,
  normalizeString,
  stem,
  STOP_WORDS,
  tokenize,
  tokenSimilarity,
} from './fuzzy-match';

describe('normalizeString', () => {
  it('lowercases and strips spaces, hyphens, underscores', () => {
    expect(normalizeString('First Name')).toBe('firstname');
    expect(normalizeString('first-name_test')).toBe('firstnametest');
    expect(normalizeString('')).toBe('');
    expect(normalizeString('foobar')).toBe('foobar');
  });
});

describe('levenshteinDistance', () => {
  it('returns 0 for equal strings', () => {
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });
  it('returns length when one side empty', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });
  it('handles canonical kitten/sitting case', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });
  it('handles flaw/lawn', () => {
    expect(levenshteinDistance('flaw', 'lawn')).toBe(2);
  });
});

describe('findClosestField', () => {
  const fields = {
    FirstName: 'Iliya',
    LastName: 'Brook',
    Email: 'i@example.com',
    YearsOfExperience: '10',
  };

  it('returns the value for exact substring match', () => {
    expect(findClosestField(fields, 'first name')).toBe('Iliya');
  });

  it('returns undefined when nothing within threshold 0.4', () => {
    expect(findClosestField(fields, 'random unrelated thing')).toBeUndefined();
  });

  it('returns undefined for empty defaultFields', () => {
    expect(findClosestField({}, 'first name')).toBeUndefined();
  });

  it('breaks ties with Levenshtein when multiple substring matches exist', () => {
    const overlap = { Email: 'a', EmailAddress: 'b' };
    expect(findClosestField(overlap, 'email')).toBe('a');
  });
});

describe('stem', () => {
  it('handles ies → y', () => {
    expect(stem('flies')).toBe('fly');
  });
  it('handles es → strip', () => {
    expect(stem('boxes')).toBe('box');
  });
  it('handles plural s → strip', () => {
    expect(stem('cats')).toBe('cat');
  });
  it('handles ing → strip', () => {
    expect(stem('running')).toBe('runn');
    expect(stem('walked')).toBe('walk');
  });
  it('preserves short words', () => {
    expect(stem('is')).toBe('is');
    expect(stem('cat')).toBe('cat');
  });
});

describe('tokenize', () => {
  it('splits camelCase into lowercase tokens', () => {
    expect(tokenize('EasyApplyButton')).toEqual(['easy', 'apply', 'button']);
  });
  it('splits snake_case and kebab-case (with stemming applied)', () => {
    expect(tokenize('snake_case-string')).toEqual(['snake', 'case', 'str']);
  });
  it('drops stop words completely', () => {
    expect(tokenize('the and or is')).toEqual([]);
  });
  it('preserves alphanumeric tokens', () => {
    expect(tokenize('web3 dev')).toEqual(['web3', 'dev']);
  });
});

describe('STOP_WORDS', () => {
  it('contains common English stop words', () => {
    expect(STOP_WORDS.has('the')).toBe(true);
    expect(STOP_WORDS.has('and')).toBe(true);
    expect(STOP_WORDS.has('engineer')).toBe(false);
  });
});

describe('jaroWinkler', () => {
  it('returns 1 for identical strings', () => {
    expect(jaroWinkler('hello', 'hello')).toBe(1);
  });
  it('returns 1 for both empty', () => {
    expect(jaroWinkler('', '')).toBe(1);
  });
  it('returns 0 when one side is empty', () => {
    expect(jaroWinkler('hello', '')).toBe(0);
    expect(jaroWinkler('', 'hello')).toBe(0);
  });
  it('matches the canonical MARTHA / MARHTA reference (~0.961)', () => {
    expect(jaroWinkler('MARTHA', 'MARHTA')).toBeCloseTo(0.961, 2);
  });
  it('applies a Winkler prefix bonus when common prefix exists', () => {
    const withPrefix = jaroWinkler('react', 'reaaa');
    const withoutPrefix = jaroWinkler('xeact', 'xeaaa');
    expect(withPrefix).toBeGreaterThanOrEqual(withoutPrefix);
  });
});

describe('tokenSimilarity', () => {
  it('returns 0 if either side empty', () => {
    expect(tokenSimilarity([], ['a'])).toBe(0);
    expect(tokenSimilarity(['a'], [])).toBe(0);
  });
  it('returns 1 for identical token arrays', () => {
    expect(tokenSimilarity(['react', 'engineer'], ['react', 'engineer'])).toBe(1);
  });
  it('partial overlap is below 1 and above 0', () => {
    const score = tokenSimilarity(['react', 'engineer'], ['react', 'designer']);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe('ngramSimilarity', () => {
  it('returns 0 when either side shorter than n', () => {
    expect(ngramSimilarity('a', 'abcd', 2)).toBe(0);
  });
  it('returns 1 for identical strings', () => {
    expect(ngramSimilarity('abcdef', 'abcdef')).toBe(1);
  });
  it('returns Jaccard ratio for partial overlap', () => {
    const result = ngramSimilarity('abcd', 'abef');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });
});

describe('calculateSimilarity', () => {
  it('returns 1.0 for identical inputs', () => {
    expect(calculateSimilarity('react developer', 'react developer')).toBeCloseTo(1.0, 2);
  });
  it('returns a low score for unrelated inputs', () => {
    expect(calculateSimilarity('react', 'banana')).toBeLessThan(0.3);
  });
  it('matches reordered job titles above default threshold', () => {
    const score = calculateSimilarity('Senior Frontend Developer', 'Frontend Engineer Senior');
    expect(score).toBeGreaterThan(0.3);
  });
});

describe('findBestMatch', () => {
  it('returns null for empty array', () => {
    expect(findBestMatch({ array: [], searchString: 'react' })).toBe(null);
  });
  it('returns null for empty / whitespace search string', () => {
    expect(findBestMatch({ array: ['a'], searchString: '' })).toBe(null);
    expect(findBestMatch({ array: ['a'], searchString: '   ' })).toBe(null);
  });
  it('exactMatchData full-string match wins over fuzzy score', () => {
    const result = findBestMatch({
      array: ['cv-fullstack.pdf', 'cv-react.pdf'],
      searchString: 'Senior React Developer',
      exactMatchData: { 'cv-fullstack.pdf': ['Senior React Developer'] },
    });
    expect(result).toBe('cv-fullstack.pdf');
  });
  it('exactMatchData first-word fallback used when no full match', () => {
    const result = findBestMatch({
      array: ['cv-react.pdf', 'cv-vue.pdf'],
      searchString: 'react developer',
      exactMatchData: { 'cv-react.pdf': ['react senior'], 'cv-vue.pdf': ['vue senior'] },
    });
    expect(result).toBe('cv-react.pdf');
  });
  it('returns null when best fuzzy score is below threshold', () => {
    expect(
      findBestMatch({
        array: ['banana'],
        searchString: 'react',
        threshold: 0.5,
      }),
    ).toBe(null);
  });
  it('picks the closest fuzzy match above threshold', () => {
    const r = findBestMatch({
      array: ['cv-react.pdf', 'cv-banana.pdf'],
      searchString: 'react developer',
    });
    expect(r).toBe('cv-react.pdf');
  });
});
