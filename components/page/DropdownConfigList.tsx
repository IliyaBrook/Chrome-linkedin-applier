import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStorage } from '@/hooks/useStorage';
import { dropdownsStorage } from '@/lib/storage';
import { sendMessage } from '@/lib/messaging';
import type { DropdownConfig } from '@/lib/types';

function DropdownCard({ config }: { config: DropdownConfig }) {
  const choose = async (value: string) => {
    await sendMessage('updateDropdownConfig', {
      placeholderIncludes: config.placeholderIncludes,
      value,
      options: config.options,
    });
  };
  const remove = async () => {
    await sendMessage('deleteDropdownConfig', config.placeholderIncludes);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">{config.placeholderIncludes}</CardTitle>
          {typeof config.count === 'number' && (
            <p className="text-xs text-muted-foreground">Counter: {config.count}</p>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Delete ${config.placeholderIncludes}`}
          onClick={() => void remove()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Select value={config.value ?? ''} onValueChange={(v) => void choose(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a value" />
          </SelectTrigger>
          <SelectContent>
            {config.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.text || opt.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

export function DropdownConfigList() {
  const { value: configs } = useStorage(dropdownsStorage);
  const list = configs ?? [];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Dropdowns</h2>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No dropdown answers learned yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((config) => (
            <li key={config.placeholderIncludes}>
              <DropdownCard config={config} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
