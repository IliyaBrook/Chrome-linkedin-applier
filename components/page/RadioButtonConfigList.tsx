import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useStorage } from '@/hooks/useStorage';
import { radioButtonsStorage } from '@/lib/storage';
import { sendMessage } from '@/lib/messaging';
import type { RadioButtonConfig } from '@/lib/types';

function isPurelyNumeric(s: string): boolean {
  return /^[0-9]+(\.[0-9]+)?$/.test(s);
}

function optionLabel(value: string, text: string): string {
  if (isPurelyNumeric(value) && text) return text;
  return value || text;
}

function RadioCard({ config }: { config: RadioButtonConfig }) {
  const choose = async (value: string) => {
    await sendMessage('updateRadioButtonValueByPlaceholder', {
      placeholderIncludes: config.placeholderIncludes,
      newValue: value,
    });
  };
  const remove = async () => {
    await sendMessage('deleteRadioButtonConfig', config.placeholderIncludes);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">{config.placeholderIncludes}</CardTitle>
          <p className="text-xs text-muted-foreground">Counter: {config.count}</p>
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
      <CardContent className="flex flex-col gap-2">
        {config.options.map((opt) => {
          const id = `${config.placeholderIncludes}-${opt.value}`;
          return (
            <div key={opt.value} className="flex items-center gap-2">
              <input
                type="radio"
                id={id}
                name={config.placeholderIncludes}
                checked={opt.selected}
                onChange={() => void choose(opt.value)}
              />
              <Label htmlFor={id}>{optionLabel(opt.value, opt.text)}</Label>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function RadioButtonConfigList() {
  const { value: configs } = useStorage(radioButtonsStorage);
  const list = configs ?? [];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Radio buttons</h2>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No radio answers learned yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((config) => (
            <li key={config.placeholderIncludes}>
              <RadioCard config={config} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
