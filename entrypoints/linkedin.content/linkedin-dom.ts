import { addDelay } from './dom-utils';
import { AA_UI_LEGACY, AA_UI_NEW, AA_UI_UNKNOWN, type JobsUI } from '@/lib/constants';

export function detectJobsUI(): JobsUI {
  const newSignal =
    !!document.querySelector('[data-component-type="LazyColumn"]') &&
    !!document.querySelector('button[aria-label^="Dismiss "][aria-label$=" job"]');
  if (newSignal) return AA_UI_NEW;

  const legacySignal = !!document.querySelector(
    '[data-occludable-job-id], .scaffold-layout__list-item',
  );
  if (legacySignal) return AA_UI_LEGACY;

  const path = window.location?.pathname || '';
  if (path.startsWith('/jobs/search-results')) return AA_UI_NEW;
  if (path.startsWith('/jobs/search')) return AA_UI_LEGACY;
  return AA_UI_UNKNOWN;
}

export function isJobsSearchPage(): boolean {
  const path = window.location?.pathname || '';
  return (
    path.startsWith('/jobs/search') ||
    path.startsWith('/jobs/collections') ||
    !!document.querySelector('[data-component-type="LazyColumn"]') ||
    !!document.querySelector('.scaffold-layout__list-item')
  );
}

export function getNewUiJobsListColumn(): HTMLElement | null {
  const cols = document.querySelectorAll('[data-component-type="LazyColumn"]');
  for (const col of cols) {
    if (
      col instanceof HTMLElement &&
      col.querySelector('button[aria-label^="Dismiss "][aria-label$=" job"]')
    ) {
      return col;
    }
  }
  return null;
}

export function getJobItems(): HTMLElement[] {
  const ui = detectJobsUI();

  if (ui === AA_UI_LEGACY) {
    const occludable = document.querySelectorAll('[data-occludable-job-id]');
    if (occludable.length > 0) {
      return Array.from(occludable).filter((el): el is HTMLElement => el instanceof HTMLElement);
    }
    return Array.from(document.querySelectorAll('.scaffold-layout__list-item')).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
  }

  if (ui === AA_UI_NEW) {
    const col = getNewUiJobsListColumn();
    if (!col) return [];
    const dismissBtns = Array.from(
      col.querySelectorAll('button[aria-label^="Dismiss "][aria-label$=" job"]'),
    );
    const cards: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();
    for (const btn of dismissBtns) {
      let cur: HTMLElement | null = btn.parentElement;
      while (cur && cur !== col) {
        if (cur.getAttribute('role') === 'button') break;
        cur = cur.parentElement;
      }
      if (
        cur &&
        cur !== col &&
        cur.getAttribute('role') === 'button' &&
        !seen.has(cur)
      ) {
        seen.add(cur);
        cards.push(cur);
      }
    }
    return cards;
  }

  return [];
}

export function getDismissButtonForItem(
  item: HTMLElement | null,
): HTMLElement | null {
  if (!item) return null;
  let btn = item.querySelector(
    'button[aria-label^="Dismiss "][aria-label$=" job"]',
  );
  if (btn instanceof HTMLElement) return btn;

  let cur: HTMLElement | null = item.parentElement;
  for (let i = 0; i < 4 && cur; i++) {
    btn = cur.querySelector('button[aria-label^="Dismiss "][aria-label$=" job"]');
    if (btn instanceof HTMLElement) return btn;
    cur = cur.parentElement;
  }
  return null;
}

export function extractJobTitleFromItem(item: HTMLElement | null): string {
  if (!item) return '';

  const dismissBtn = getDismissButtonForItem(item);
  if (dismissBtn) {
    const al = dismissBtn.getAttribute('aria-label') || '';
    const m = al.match(/^Dismiss\s+(.+?)\s+job$/i);
    if (m && m[1]) return m[1].trim().toLowerCase();
  }

  const link = item.querySelector(
    '.artdeco-entity-lockup__title .job-card-container__link, .artdeco-entity-lockup__title a, a[href*="/jobs/view/"]',
  );
  if (link) {
    const visible = link.querySelector('span[aria-hidden="true"]');
    if (visible && visible.textContent && visible.textContent.trim()) {
      return visible.textContent.trim().toLowerCase();
    }
    const al = link.getAttribute('aria-label') || link.textContent || '';
    return al.trim().toLowerCase();
  }
  return '';
}

export function getJobItemClickTarget(item: HTMLElement | null): HTMLElement | null {
  if (!item) return null;
  const link = item.querySelector(
    '.artdeco-entity-lockup__title .job-card-container__link, .artdeco-entity-lockup__title a, a[href*="/jobs/view/"]',
  );
  if (link instanceof HTMLElement) return link;
  if (item.getAttribute('role') === 'button') return item;
  return null;
}

export function extractCompanyNameFromItem(item: HTMLElement | null): string {
  if (!item) return '';

  const legacy = item.querySelectorAll('[class*="subtitle"]');
  if (legacy.length > 0) {
    const txt = legacy[0].textContent || '';
    return txt.trim();
  }

  const dismissBtn = getDismissButtonForItem(item);
  const titleAl = dismissBtn ? dismissBtn.getAttribute('aria-label') || '' : '';
  const titleMatch = titleAl.match(/^Dismiss\s+(.+?)\s+job$/i);
  const titleText = titleMatch ? titleMatch[1].trim() : '';

  const candidateNodes = item.querySelectorAll('p, span, div');
  for (const n of candidateNodes) {
    const t = (n.textContent || '').trim();
    if (!t || t.length > 80) continue;
    if (titleText && t.toLowerCase() === titleText.toLowerCase()) continue;
    if (/^(promoted|applied|viewed|easy apply|on-site|hybrid|remote)\b/i.test(t)) continue;
    if (/\d{1,2}\s*(day|week|month|hour|minute)/i.test(t)) continue;
    return t;
  }
  return '';
}

export function isItemAlreadyApplied(item: HTMLElement | null): boolean {
  if (!item) return false;

  const legacyFooter = item.querySelector('[class*="footer"]');
  if (legacyFooter) {
    const ft = (legacyFooter.textContent || '').trim();
    if (ft === 'Applied' || /^Applied(\s|$)/.test(ft)) return true;
  }

  const leaves = item.querySelectorAll('p, span, div, time');
  for (const el of leaves) {
    const t = (el.textContent || '').trim();
    if (!t || t.length > 60) continue;
    if (/^Applied(\s|$|\d|·)/.test(t)) return true;
  }
  return false;
}

export function getJobIdFromItem(item: HTMLElement | null): string | null {
  if (!item) return null;
  const occ = item.getAttribute('data-occludable-job-id');
  if (occ) return occ;
  const key = item.getAttribute('componentkey') || '';
  const m = key.match(/job-card-component-ref-(\d+)/);
  if (m) return m[1];
  const child = item.querySelector('[data-job-id]');
  if (child) return child.getAttribute('data-job-id');
  return null;
}

export function findJobItemByJobId(jobId: string | null): HTMLElement | null {
  if (!jobId) return null;
  const id = String(jobId);

  const newCard = document.querySelector(
    `[componentkey="job-card-component-ref-${id}"]`,
  );
  if (newCard instanceof HTMLElement) return newCard;

  const legacyLi = document.querySelector(`li[data-occludable-job-id="${id}"]`);
  if (legacyLi instanceof HTMLElement) return legacyLi;

  const dataAttr = document.querySelector(`[data-job-id="${id}"]`);
  return dataAttr instanceof HTMLElement ? dataAttr : null;
}

export function getJobsListScrollContainer(): HTMLElement | null {
  const ui = detectJobsUI();
  if (ui === AA_UI_LEGACY) {
    const el = document.querySelector('.scaffold-layout__list > div');
    return el instanceof HTMLElement ? el : null;
  }
  if (ui === AA_UI_NEW) {
    const col = getNewUiJobsListColumn();
    if (!col) return null;
    let cur: HTMLElement | null = col;
    for (let i = 0; i < 6 && cur; i++) {
      const cs = getComputedStyle(cur);
      if (
        (cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
        cur.scrollHeight > cur.clientHeight + 1
      ) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return col;
  }
  return null;
}

export type PaginationInfo = {
  ui: JobsUI;
  activePageText: string;
  nextButton: HTMLElement | null;
};

export function getPaginationInfo(): PaginationInfo {
  const ui = detectJobsUI();

  if (ui === AA_UI_LEGACY) {
    const pagination = document.querySelector('.jobs-search-pagination');
    const activeBtn = pagination?.querySelector(
      '.jobs-search-pagination__indicator-button--active',
    );
    const nextBtn = pagination?.querySelector("button[aria-label*='next']");
    return {
      ui,
      activePageText: (activeBtn instanceof HTMLElement ? activeBtn.innerText : '') || '',
      nextButton: nextBtn instanceof HTMLElement ? nextBtn : null,
    };
  }

  if (ui === AA_UI_NEW) {
    const list = document.querySelector('[data-testid="pagination-controls-list"]');
    const indicators = list
      ? Array.from(list.querySelectorAll('[data-testid^="pagination-indicator-"]'))
      : [];
    const activeIndicator = indicators.find(
      (el) =>
        el.getAttribute('aria-current') === 'page' ||
        el.getAttribute('aria-current') === 'true',
    );
    const nextBtn =
      document.querySelector(
        '[data-testid="pagination-controls-next-button-visible"]',
      ) ||
      document.querySelector(
        '[data-testid^="pagination-controls-next-button"]:not([data-testid$="hidden"])',
      );
    return {
      ui,
      activePageText: activeIndicator?.textContent?.trim() || '',
      nextButton: nextBtn instanceof HTMLElement ? nextBtn : null,
    };
  }

  return { ui, activePageText: '', nextButton: null };
}

export async function waitForJobItems(timeout = 8000): Promise<HTMLElement[]> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const items = getJobItems();
    if (items.length > 0) return items;
    await addDelay(300);
  }
  return getJobItems();
}

export async function waitForJobDetailsLoaded(
  timeout = 8000,
  expectedJobId: string | null = null,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (
      document.querySelector(
        '[aria-label^="LinkedIn Apply to"]:not([role="radio"]):not([class*="artdeco-pill"]),' +
          ' [aria-label="Apply on company website"],' +
          ' a[href*="openSDUIApplyFlow=true"]',
      )
    ) {
      return true;
    }

    if (document.querySelector('button[aria-label="Save the job"]')) return true;

    const main = document.querySelector('.jobs-details__main-content');
    if (main && main.children && main.children.length > 0) return true;

    if (expectedJobId) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('currentJobId') === String(expectedJobId)) {
        await addDelay(400);
        return true;
      }
    }

    await addDelay(250);
  }
  return false;
}

export function getJobTitle(jobNameLink: HTMLElement | null): string {
  if (!jobNameLink) return '';
  let jobTitle: string;

  const visibleSpan = jobNameLink.querySelector('span[aria-hidden="true"]');
  if (visibleSpan && visibleSpan.textContent && visibleSpan.textContent.trim().length > 0) {
    jobTitle = visibleSpan.textContent.trim();
  } else {
    jobTitle = jobNameLink.getAttribute('aria-label') || '';
    if (!jobTitle) {
      console.trace('Job title not found using both selectors');
    }
  }
  return jobTitle.toLowerCase();
}
