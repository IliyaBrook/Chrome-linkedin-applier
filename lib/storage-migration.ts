import { AA_REASONS, type ApplyHistoryEntry, type ApplyReason } from './types';

const VALID_REASONS = new Set<ApplyReason>(AA_REASONS);

export type ApplyHistoryPruneResult = {
  next: ApplyHistoryEntry[];
  dropped: number;
};

export function pruneInvalidApplyHistory(input: unknown): ApplyHistoryPruneResult {
  if (!Array.isArray(input)) return { next: [], dropped: 0 };

  const next: ApplyHistoryEntry[] = [];
  let dropped = 0;
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') {
      dropped++;
      continue;
    }
    const e = raw as Partial<ApplyHistoryEntry>;
    if (typeof e.reason !== 'string' || !VALID_REASONS.has(e.reason as ApplyReason)) {
      dropped++;
      continue;
    }
    if (typeof e.timestamp !== 'number') {
      dropped++;
      continue;
    }
    next.push(e as ApplyHistoryEntry);
  }
  return { next, dropped };
}

export type CvSelectionResult = {
  next: string | null;
  cleared: boolean;
};

export function reconcileSelectedCv(
  selectedId: unknown,
  cvFiles: unknown,
): CvSelectionResult {
  if (typeof selectedId !== 'string' || selectedId === '') {
    return { next: null, cleared: false };
  }
  if (!Array.isArray(cvFiles)) {
    return { next: null, cleared: true };
  }
  const exists = cvFiles.some(
    (f) => f && typeof f === 'object' && (f as { id?: unknown }).id === selectedId,
  );
  return exists
    ? { next: selectedId, cleared: false }
    : { next: null, cleared: true };
}
