import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useStorage } from '@/hooks/useStorage';
import { inputFieldConfigsStorage } from '@/lib/storage';
import { sendMessage } from '@/lib/messaging';
import type { InputFieldConfig } from '@/lib/types';

export function sortConfigs(configs: InputFieldConfig[]): InputFieldConfig[] {
  return [...configs].sort((a, b) => {
    const aTime = a.createdAt ?? 0;
    const bTime = b.createdAt ?? 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.count - a.count;
  });
}

function InputFieldConfigCard({ config }: { config: InputFieldConfig }) {
  const [draft, setDraft] = useState(config.defaultValue);
  const [busy, setBusy] = useState(false);

  const update = async () => {
    setBusy(true);
    try {
      await sendMessage('updateInputFieldValue', {
        placeholder: config.placeholderIncludes,
        value: draft,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await sendMessage('deleteInputFieldConfig', config.placeholderIncludes);
  };

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="text-base">{config.placeholderIncludes}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Current value: {config.defaultValue || <em>empty</em>} · Counter: {config.count}
        </p>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button onClick={() => void update()} disabled={busy}>
          Update
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Delete ${config.placeholderIncludes}`}
          onClick={() => void remove()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function InputFieldConfigList() {
  const { value: configs } = useStorage(inputFieldConfigsStorage);
  const list = sortConfigs(configs ?? []);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Text fields</h2>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          The script learns text answers as it runs — they will appear here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((config) => (
            <li key={config.placeholderIncludes}>
              <InputFieldConfigCard config={config} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
