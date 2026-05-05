import { REASON_LABELS, type ApplyHistoryEntry, type ApplyReason } from '@/lib/types';

export type StatusFilter = 'all' | 'applied' | 'notApplied' | 'errors';

export function applyStatusFilter(
  entries: ApplyHistoryEntry[],
  status: StatusFilter,
): ApplyHistoryEntry[] {
  switch (status) {
    case 'applied':
      return entries.filter((e) => e.applied);
    case 'notApplied':
      return entries.filter((e) => !e.applied);
    case 'errors':
      return entries.filter((e) => e.reason === 'error');
    default:
      return entries;
  }
}

export function applyReasonFilter(
  entries: ApplyHistoryEntry[],
  reason: ApplyReason | 'all',
): ApplyHistoryEntry[] {
  if (reason === 'all') return entries;
  return entries.filter((e) => e.reason === reason);
}

export function applySearchFilter(
  entries: ApplyHistoryEntry[],
  search: string,
): ApplyHistoryEntry[] {
  const trimmed = search.trim().toLowerCase();
  if (!trimmed) return entries;
  return entries.filter((e) => {
    const haystack = [
      e.title,
      e.companyName,
      e.description ?? '',
      REASON_LABELS[e.reason] ?? e.reason,
    ]
      .join('\n')
      .toLowerCase();
    return haystack.includes(trimmed);
  });
}

export function summarize(entries: ApplyHistoryEntry[]) {
  let applied = 0;
  let skipped = 0;
  let errors = 0;
  for (const entry of entries) {
    if (entry.reason === 'error') errors += 1;
    else if (entry.applied) applied += 1;
    else skipped += 1;
  }
  return { total: entries.length, applied, skipped, errors };
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(entries: ApplyHistoryEntry[]): string {
  const header = ['Time', 'Title', 'Company', 'Applied', 'Reason', 'Description', 'URL'];
  const rows = entries.map((entry) => [
    new Date(entry.timestamp).toISOString(),
    entry.title,
    entry.companyName,
    entry.applied ? 'YES' : 'NO',
    REASON_LABELS[entry.reason] ?? entry.reason,
    entry.description ?? '',
    entry.url,
  ]);
  return [header, ...rows].map((cols) => cols.map(escapeCsv).join(',')).join('\n');
}

export function uniqueReasons(entries: ApplyHistoryEntry[]): ApplyReason[] {
  const set = new Set<ApplyReason>();
  for (const entry of entries) set.add(entry.reason);
  return [...set].sort((a, b) =>
    (REASON_LABELS[a] ?? a).localeCompare(REASON_LABELS[b] ?? b),
  );
}
