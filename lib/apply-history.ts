import { applyHistoryStorage } from './storage';
import { AA_HISTORY_LIMIT, type ApplyHistoryEntry, type ApplyReason } from './types';

export function appendApplyHistoryEntry(
  prev: ApplyHistoryEntry[],
  entry: ApplyHistoryEntry,
  limit: number = AA_HISTORY_LIMIT,
): ApplyHistoryEntry[] {
  const next = [entry, ...prev];
  if (next.length > limit) next.length = limit;
  return next;
}

export type RecordApplyHistoryParams = {
  jobId?: string | null;
  title?: string | null;
  companyName?: string | null;
  url?: string | null;
  applied?: boolean;
  reason?: ApplyReason | null;
  description?: string | null;
};

export function buildHistoryEntry(
  params: RecordApplyHistoryParams,
  now: number = Date.now(),
): ApplyHistoryEntry {
  return {
    timestamp: now,
    jobId: params.jobId ?? null,
    title: (params.title ?? '').trim(),
    companyName: (params.companyName ?? '').trim(),
    url: params.url ?? '',
    applied: Boolean(params.applied),
    reason: params.applied ? 'applied' : params.reason ?? 'other',
    description: params.description ?? null,
  };
}

export async function recordApplyHistoryEntry(params: RecordApplyHistoryParams): Promise<void> {
  try {
    const entry = buildHistoryEntry(params);
    const prev = await applyHistoryStorage.getValue();
    const next = appendApplyHistoryEntry(prev, entry);
    await applyHistoryStorage.setValue(next);
  } catch {
    // Tracking should never break the main flow.
  }
}
