import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function dedupeAdd(list: string[], candidate: string): { ok: boolean; next: string[] } {
  const trimmed = candidate.trim();
  if (!trimmed) return { ok: false, next: list };
  const lower = trimmed.toLowerCase();
  if (list.some((w) => w.toLowerCase() === lower)) return { ok: false, next: list };
  return { ok: true, next: [...list, trimmed] };
}

export function updateAt(list: string[], index: number, value: string): string[] {
  const next = [...list];
  next[index] = value;
  return next;
}

export function removeAt(list: string[], index: number): string[] {
  return list.filter((_, i) => i !== index);
}

export type WordListEditorProps = {
  title: string;
  description?: string;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  words: string[];
  onWordsChange: (next: string[]) => Promise<void> | void;
  duplicateMessage?: string;
  inputPlaceholder?: string;
};

export function WordListEditor({
  title,
  description,
  enabled,
  onEnabledChange,
  words,
  onWordsChange,
  duplicateMessage = 'Oops! This word is already in your filter. Try adding a new one!',
  inputPlaceholder = 'Add a word…',
}: WordListEditorProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submitDraft = async () => {
    setError(null);
    const result = dedupeAdd(words, draft);
    if (!result.ok) {
      if (draft.trim()) setError(duplicateMessage);
      return;
    }
    await onWordsChange(result.next);
    setDraft('');
  };

  const onItemEdit = async (index: number, value: string) => {
    await onWordsChange(updateAt(words, index, value));
  };

  const onItemRemove = async (index: number) => {
    await onWordsChange(removeAt(words, index));
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor={`${title}-toggle`} className="text-xs uppercase tracking-wide">
              Enabled
            </Label>
            <Switch
              id={`${title}-toggle`}
              checked={enabled}
              onCheckedChange={onEnabledChange}
            />
          </div>
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder={inputPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void submitDraft();
              }
            }}
          />
          <Button onClick={() => void submitDraft()}>Add</Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <ul className="flex flex-col gap-1">
          {words.map((word, index) => (
            <li key={`${word}-${index}`} className="flex items-center gap-2">
              <Input value={word} onChange={(e) => void onItemEdit(index, e.target.value)} />
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${word}`}
                onClick={() => void onItemRemove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {words.length === 0 && (
            <li className="text-sm text-muted-foreground">No words yet — add the first.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
