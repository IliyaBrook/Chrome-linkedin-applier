import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStorage } from '@/hooks/useStorage';
import { defaultFieldsStorage } from '@/lib/storage';
import { sendMessage } from '@/lib/messaging';
import {
  DEFAULT_FIELD_KEYS,
  EMPTY_DEFAULT_FIELDS,
  type DefaultFieldKey,
  type DefaultFields,
} from '@/lib/types';

const FIELD_LABELS: Record<DefaultFieldKey, string> = {
  YearsOfExperience: 'Years of experience',
  FirstName: 'First name',
  LastName: 'Last name',
  PhoneNumber: 'Mobile phone number',
  City: 'City',
  Email: 'Email',
};

const MIRRORED_FIELDS: Partial<Record<DefaultFieldKey, string>> = {
  FirstName: 'First name',
  LastName: 'Last name',
  PhoneNumber: 'Mobile phone number',
};

export function isComplete(fields: DefaultFields): boolean {
  return Object.values(fields).every((v) => v.trim().length > 0);
}

export function DefaultFieldsForm() {
  const { value: stored, setValue: setStored } = useStorage(defaultFieldsStorage);
  const fields = stored ?? EMPTY_DEFAULT_FIELDS;
  const complete = isComplete(fields);

  const onFieldChange = async (key: DefaultFieldKey, value: string) => {
    const next: DefaultFields = { ...fields, [key]: value };
    await setStored(next);
    const mirrorPlaceholder = MIRRORED_FIELDS[key];
    if (mirrorPlaceholder) {
      try {
        await sendMessage('updateInputFieldValue', {
          placeholder: mirrorPlaceholder,
          value,
        });
      } catch {
        // background not available — ignore in dev
      }
    }
  };

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>Required personal info</CardTitle>
        <CardDescription>
          {complete ? (
            <span className="text-emerald-700">You are ready to use auto apply!</span>
          ) : (
            <span className="text-destructive">Please fill out the missing values:</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {DEFAULT_FIELD_KEYS.map((key) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`field-${key}`}>{FIELD_LABELS[key]}</Label>
            <Input
              id={`field-${key}`}
              value={fields[key]}
              onChange={(e) => void onFieldChange(key, e.target.value)}
              data-error={!fields[key].trim() ? 'true' : undefined}
              className={!fields[key].trim() ? 'border-destructive' : undefined}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
