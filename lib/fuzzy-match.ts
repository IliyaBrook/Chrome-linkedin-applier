export const STOP_WORDS = new Set<string>([
  'and',
  'or',
  'the',
  'a',
  'an',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'should',
  'could',
  'may',
  'might',
  'must',
  'can',
]);

export function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[\s\-_]+/g, '');
}

export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function findClosestField(
  defaultFields: Record<string, string>,
  inputString: string,
): string | undefined {
  const normalizedInput = normalizeString(inputString);
  const substringMatches: string[] = [];

  for (const key in defaultFields) {
    const normalizedKey = normalizeString(key);
    if (normalizedKey.includes(normalizedInput) || normalizedInput.includes(normalizedKey)) {
      substringMatches.push(key);
    }
  }

  if (substringMatches.length === 1) {
    return defaultFields[substringMatches[0]];
  }
  if (substringMatches.length > 1) {
    let bestKey: string | null = null;
    let bestScore = Infinity;
    for (const key of substringMatches) {
      const normalizedKey = normalizeString(key);
      const distance = levenshteinDistance(normalizedInput, normalizedKey);
      const score = distance / Math.max(normalizedInput.length, normalizedKey.length);
      if (score < bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }
    return bestScore <= 0.4 && bestKey !== null ? defaultFields[bestKey] : undefined;
  }

  let bestKey: string | null = null;
  let bestScore = Infinity;
  for (const key in defaultFields) {
    const normalizedKey = normalizeString(key);
    const distance = levenshteinDistance(normalizedInput, normalizedKey);
    const score = distance / Math.max(normalizedInput.length, normalizedKey.length);
    if (score < bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestScore <= 0.4 && bestKey !== null ? defaultFields[bestKey] : undefined;
}

export function stem(word: string): string {
  if (word.endsWith('ies') && word.length > 4) {
    return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('es') && word.length > 3) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && word.length > 3) {
    return word.slice(0, -1);
  }
  if (word.endsWith('ing') && word.length > 5) {
    return word.slice(0, -3);
  }
  if (word.endsWith('ed') && word.length > 4) {
    return word.slice(0, -2);
  }
  return word;
}

export function tokenize(str: string): string[] {
  const processed = str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

  return processed
    .replace(/[_\-.]+/g, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .filter((token) => !STOP_WORDS.has(token))
    .map((token) => stem(token));
}

export function jaroWinkler(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n === 0 ? 1 : 0;
  if (n === 0) return 0;

  const matchWindow = Math.floor(Math.max(m, n) / 2) - 1;
  const s1Matches = new Array<boolean>(m).fill(false);
  const s2Matches = new Array<boolean>(n).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < m; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, n);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < m; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / m + matches / n + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(m, n)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

export function tokenSimilarity(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  let bestMatches = 0;
  const used = new Set<number>();

  for (const t1 of tokens1) {
    let bestScore = 0;
    let bestIdx = -1;
    for (let i = 0; i < tokens2.length; i++) {
      if (used.has(i)) continue;
      let score = 0;
      if (t1 === tokens2[i]) {
        score = 1.0;
      } else if (t1.includes(tokens2[i]) || tokens2[i].includes(t1)) {
        const overlap = Math.min(t1.length, tokens2[i].length);
        const maxLen = Math.max(t1.length, tokens2[i].length);
        score = 0.8 * (overlap / maxLen);
      } else {
        const similarity = jaroWinkler(t1, tokens2[i]);
        if (similarity > 0.85) {
          score = 0.7 * similarity;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx !== -1) {
      bestMatches += bestScore;
      used.add(bestIdx);
    }
  }
  return bestMatches / Math.max(tokens1.length, tokens2.length);
}

export function ngramSimilarity(s1: string, s2: string, n = 2): number {
  if (s1.length < n || s2.length < n) return 0;

  const getNgrams = (str: string): Set<string> => {
    const ngrams = new Set<string>();
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.add(str.slice(i, i + n));
    }
    return ngrams;
  };

  const ngrams1 = getNgrams(s1);
  const ngrams2 = getNgrams(s2);
  let intersection = 0;
  for (const ngram of ngrams1) {
    if (ngrams2.has(ngram)) intersection++;
  }
  const union = ngrams1.size + ngrams2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function calculateSimilarity(query: string, candidate: string): number {
  const queryTokens = tokenize(query);
  const candidateTokens = tokenize(candidate);
  const tokenScore = tokenSimilarity(queryTokens, candidateTokens);
  const normalizedQuery = queryTokens.join('');
  const normalizedCandidate = candidateTokens.join('');
  const stringScore = jaroWinkler(normalizedQuery, normalizedCandidate);
  const ngramScore = ngramSimilarity(normalizedQuery, normalizedCandidate, 2);
  return tokenScore * 0.4 + stringScore * 0.35 + ngramScore * 0.25;
}

export type FindBestMatchOptions = {
  array: string[];
  searchString: string;
  threshold?: number;
  exactMatchData?: Record<string, string[]> | null;
};

export function findBestMatch({
  array,
  searchString,
  threshold = 0.3,
  exactMatchData = null,
}: FindBestMatchOptions): string | null {
  if (!array || array.length === 0) return null;
  if (!searchString || searchString.trim() === '') return null;

  if (exactMatchData && typeof exactMatchData === 'object') {
    const searchStringLower = searchString.toLowerCase().trim();
    const searchWords = searchString.trim().split(/\s+/);
    const firstWord = searchWords[0]?.toLowerCase();

    for (const [key, values] of Object.entries(exactMatchData)) {
      if (!array.includes(key)) continue;
      if (Array.isArray(values)) {
        for (const value of values) {
          if (value && value.toLowerCase().trim() === searchStringLower) {
            return key;
          }
        }
      }
    }

    if (firstWord) {
      for (const [key, values] of Object.entries(exactMatchData)) {
        if (!array.includes(key)) continue;
        if (Array.isArray(values)) {
          for (const value of values) {
            if (value) {
              const valueWords = value.trim().split(/\s+/);
              const valueFirstWord = valueWords[0]?.toLowerCase();
              if (valueFirstWord === firstWord) {
                return key;
              }
            }
          }
        }
      }
    }
  }

  let bestMatch: string | null = null;
  let bestScore = -1;
  for (const item of array) {
    const score = calculateSimilarity(searchString, item);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }
  return bestScore >= threshold ? bestMatch : null;
}
