export function matchesFilter(text: string, word: string): boolean {
  if (!text || !word) return false;
  const lowerText = text.toLowerCase();
  const lowerWord = word.toLowerCase().trim();
  if (!lowerWord) return false;

  if (lowerWord.length <= 4) {
    const escaped = lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(text);
  }

  return lowerText.includes(lowerWord);
}

export function checkIfAlreadyApplied(textContent: string): boolean {
  if (!textContent) return false;
  const lowerText = textContent.toLowerCase();
  return (
    lowerText.includes('applied') &&
    (lowerText.includes('ago') ||
      lowerText.includes('minutes') ||
      lowerText.includes('hours') ||
      lowerText.includes('days'))
  );
}
