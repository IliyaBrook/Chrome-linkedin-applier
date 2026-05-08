import { useMemo, useState } from 'react';
import { Bug, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLayout } from '@/components/page/PageLayout';
import { DebugHtmlDialog } from '@/components/apply-history/DebugHtmlDialog';
import { useStorage } from '@/hooks/useStorage';
import { applyHistoryStorage } from '@/lib/storage';
import { REASON_LABELS, type ApplyHistoryEntry, type ApplyReason } from '@/lib/types';
import {
  applyReasonFilter,
  applySearchFilter,
  applyStatusFilter,
  summarize,
  toCsv,
  uniqueReasons,
  type StatusFilter,
} from './filtering';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function downloadCsv(entries: ApplyHistoryEntry[]) {
  const csv = toCsv(entries);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date();
  const stamp = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  a.href = url;
  a.download = `apply-history-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function App() {
  const { value: history, setValue: setHistory } = useStorage(applyHistoryStorage);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [reason, setReason] = useState<ApplyReason | 'all'>('all');
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [debugEntry, setDebugEntry] = useState<ApplyHistoryEntry | null>(null);

  const entries = history ?? [];
  const reasons = useMemo(() => uniqueReasons(entries), [entries]);
  const filtered = useMemo(() => {
    return applySearchFilter(applyReasonFilter(applyStatusFilter(entries, status), reason), search);
  }, [entries, status, reason, search]);
  const stats = useMemo(() => summarize(entries), [entries]);

  const removeRow = (entry: ApplyHistoryEntry) =>
    void setHistory(
      entries.filter((e) => !(e.timestamp === entry.timestamp && e.jobId === entry.jobId)),
    );

  const clearAll = async () => {
    await setHistory([]);
    setConfirmClear(false);
  };

  return (
    <PageLayout
      title="Apply History"
      description="Every iteration the script touched, with its outcome."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="destructive"
            disabled={entries.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </Button>
        </div>
      }
    >
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatPill label="Total" value={stats.total} tone="muted" />
        <StatPill label="Applied" value={stats.applied} tone="success" />
        <StatPill label="Skipped" value={stats.skipped} tone="warn" />
        <StatPill label="Errors" value={stats.errors} tone="danger" />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status-filter">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger id="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="applied">Applied only</SelectItem>
              <SelectItem value="notApplied">Not applied only</SelectItem>
              <SelectItem value="errors">Errors only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason-filter">Reason</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as ApplyReason | 'all')}>
            <SelectTrigger id="reason-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reasons</SelectItem>
              {reasons.map((r) => (
                <SelectItem key={r} value={r}>
                  {REASON_LABELS[r] ?? r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="search-filter">Search</Label>
          <Input
            id="search-filter"
            placeholder="Title, company, description, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history entries match the current filters.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Company</th>
                      <th className="px-3 py-2">Applied</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">URL</th>
                      <th className="px-3 py-2">Debug</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((entry) => (
                      <tr
                        key={`${entry.timestamp}-${entry.jobId ?? 'noid'}`}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {formatTimestamp(entry.timestamp)}
                        </td>
                        <td className="px-3 py-2 font-medium">{entry.title}</td>
                        <td className="px-3 py-2">{entry.companyName}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              entry.applied
                                ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800'
                                : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800'
                            }
                          >
                            {entry.applied ? 'YES' : 'NO'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {entry.applied ? '—' : REASON_LABELS[entry.reason] ?? entry.reason}
                        </td>
                        <td className="max-w-md truncate px-3 py-2 text-xs text-muted-foreground">
                          {entry.applied ? '—' : entry.description ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {entry.url ? (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {entry.debugHtml ? (
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label="Open debug HTML snapshot"
                              title="Inspect captured HTML"
                              onClick={() => setDebugEntry(entry)}
                            >
                              <Bug className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Delete entry from ${entry.companyName}`}
                            onClick={() => removeRow(entry)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <DebugHtmlDialog entry={debugEntry} onClose={() => setDebugEntry(null)} />

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear all apply history?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes every history entry from this device. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void clearAll()}>
              Yes, clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'muted' | 'success' | 'warn' | 'danger';
}) {
  const toneClasses: Record<typeof tone, string> = {
    muted: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-100 text-emerald-800',
    warn: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
  };
  return (
    <div className={`rounded-md px-3 py-2 text-center ${toneClasses[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
