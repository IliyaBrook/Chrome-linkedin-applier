import { ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLayout } from '@/components/page/PageLayout';
import { useStorage } from '@/hooks/useStorage';
import { externalApplyDataStorage } from '@/lib/storage';
import type { ExternalApplyEntry } from '@/lib/types';

export function dedupeByLink(entries: ExternalApplyEntry[]): ExternalApplyEntry[] {
  const seen = new Set<string>();
  const result: ExternalApplyEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.link)) continue;
    seen.add(entry.link);
    result.push(entry);
  }
  return result;
}

function formatDate(time: number): string {
  return new Date(time).toLocaleString();
}

export default function App() {
  const { value: entries, setValue: setEntries } = useStorage(externalApplyDataStorage);
  const list = entries ?? [];

  const removeAll = () => void setEntries([]);
  const removeDuplicates = () => void setEntries(dedupeByLink(list));
  const openAll = () => list.forEach((e) => window.open(e.link, '_blank'));
  const deleteOne = (link: string) => void setEntries(list.filter((e) => e.link !== link));

  return (
    <PageLayout
      title="External Apply"
      description={`Total saved: ${list.length}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" disabled={list.length === 0} onClick={removeAll}>
            Remove all
          </Button>
          <Button variant="outline" disabled={list.length < 2} onClick={removeDuplicates}>
            Remove duplicates
          </Button>
          <Button disabled={list.length === 0} onClick={openAll}>
            <ExternalLink className="h-4 w-4" />
            Open all
          </Button>
        </div>
      }
    >
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved external apply jobs yet.</p>
      ) : (
        <ul className="grid gap-3">
          {list.map((entry) => (
            <li key={`${entry.link}-${entry.time}`}>
              <Card>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{entry.companyName || 'Unknown company'}</span>
                      <span>{formatDate(entry.time)}</span>
                    </div>
                    <h3 className="text-sm font-semibold">{entry.title}</h3>
                    <a
                      href={entry.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-xs text-primary underline-offset-2 hover:underline"
                    >
                      {entry.link}
                    </a>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${entry.title}`}
                    onClick={() => deleteOne(entry.link)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
