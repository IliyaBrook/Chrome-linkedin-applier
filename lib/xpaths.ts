const _UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const _LOWER = 'abcdefghijklmnopqrstuvwxyz';
const lc = (attr: string) => `translate(${attr}, '${_UPPER}', '${_LOWER}')`;
const NOT_FILTER_PILL = "not(@role='radio') and not(contains(@class, 'artdeco-pill'))";

export const EASY_APPLY_BUTTON_XPATH = [
  `//*[(self::button or self::a) and starts-with(${lc('@aria-label')}, 'linkedin apply to')]`,
  `//a[contains(@href, 'openSDUIApplyFlow=true')]`,
  `//button[contains(@class, 'jobs-apply-button') and not(${lc('@aria-label')} = 'apply on company website') and ${NOT_FILTER_PILL}]`,
].join(' | ');

export const NOT_EASY_APPLY_BUTTON_XPATH = [
  `//*[(self::button or self::a) and ${lc('@aria-label')} = 'apply on company website']`,
  `//button[contains(@class, 'jobs-apply-button') and not(starts-with(${lc('@aria-label')}, 'linkedin apply')) and ${NOT_FILTER_PILL}]`,
].join(' | ');

export const XPATHS = {
  EASY_APPLY_BUTTON: EASY_APPLY_BUTTON_XPATH,
  NOT_EASY_APPLY_BUTTON: NOT_EASY_APPLY_BUTTON_XPATH,
} as const;
