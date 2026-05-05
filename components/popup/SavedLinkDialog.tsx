import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SavedLinkDialogProps = {
  open: boolean;
  mode: 'add' | 'edit';
  initialName?: string;
  initialUrl?: string;
  onClose: () => void;
  onSave: (data: { name: string; url: string; previousName: string | null }) => void;
};

export function SavedLinkDialog({
  open,
  mode,
  initialName = '',
  initialUrl = '',
  onClose,
  onSave,
}: SavedLinkDialogProps) {
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setUrl(initialUrl);
      setError(null);
    }
  }, [open, initialName, initialUrl]);

  const submit = () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) {
      setError('Both name and URL are required.');
      return;
    }
    onSave({
      name: trimmedName,
      url: trimmedUrl,
      previousName: mode === 'edit' ? initialName : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit job search link' : 'Add job search link'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-name">Link name</Label>
            <Input
              id="link-name"
              value={name}
              placeholder="Link name"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-url">Job search URL</Label>
            <Input
              id="link-url"
              value={url}
              placeholder="https://www.linkedin.com/jobs/search/?..."
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
