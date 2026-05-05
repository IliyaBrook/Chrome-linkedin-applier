import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStorage } from '@/hooks/useStorage';
import { useActiveTab } from '@/hooks/useActiveTab';
import { savedLinksStorage } from '@/lib/storage';
import { sendMessage } from '@/lib/messaging';
import { LINKEDIN_JOBS_PATH_FRAGMENT } from '@/lib/constants';
import { SavedLinkDialog } from './SavedLinkDialog';

type DialogState =
  | { mode: 'closed' }
  | { mode: 'add'; url: string }
  | { mode: 'edit'; name: string; url: string };

export function validateAndUpsert(
  current: Record<string, string>,
  payload: { name: string; url: string; previousName: string | null },
): { ok: true; next: Record<string, string> } | { ok: false; error: string } {
  const { name, url, previousName } = payload;
  if (previousName === null) {
    if (name in current) return { ok: false, error: 'Link name already exists.' };
    if (Object.values(current).includes(url)) return { ok: false, error: 'Link already exists.' };
    return { ok: true, next: { ...current, [name]: url } };
  }
  if (previousName !== name && name in current) {
    return { ok: false, error: 'Link name already exists.' };
  }
  const next = { ...current };
  if (previousName !== name) delete next[previousName];
  next[name] = url;
  return { ok: true, next };
}

export function SavedLinks() {
  const { value: savedLinks, setValue: setSavedLinks } = useStorage(savedLinksStorage);
  const activeTab = useActiveTab();
  const [showAccordion, setShowAccordion] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });
  const [error, setError] = useState<string | null>(null);
  const links = savedLinks ?? {};

  const onSaveLink = () => {
    setError(null);
    if (!activeTab.url.includes(LINKEDIN_JOBS_PATH_FRAGMENT)) {
      setError('Save is only available on the LinkedIn jobs search page.');
      return;
    }
    setDialog({ mode: 'add', url: activeTab.url });
  };

  const submitDialog = async (payload: {
    name: string;
    url: string;
    previousName: string | null;
  }) => {
    const result = validateAndUpsert(links, payload);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await setSavedLinks(result.next);
    setDialog({ mode: 'closed' });
    setError(null);
  };

  const deleteLink = async (name: string) => {
    const next = { ...links };
    delete next[name];
    await setSavedLinks(next);
  };

  const goLink = (url: string) => {
    void sendMessage('openTabAndRunScript', { url });
  };

  const entries = Object.entries(links);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onSaveLink}>
          <Plus className="h-4 w-4" />
          Save link
        </Button>
        <Button variant="outline" onClick={() => setShowAccordion((s) => !s)}>
          {showAccordion ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showAccordion ? 'Hide saved links' : 'Show saved links'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {showAccordion && (
        <div className="rounded-md border bg-muted/40 p-2">
          {entries.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">No saved links available.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {entries.map(([name, url]) => (
                <li
                  key={name}
                  className="flex items-center gap-2 rounded-md bg-background p-2 shadow-sm"
                >
                  <span className="flex-1 truncate text-sm" title={url}>
                    {name}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Open ${name}`}
                    onClick={() => goLink(url)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${name}`}
                    onClick={() => setDialog({ mode: 'edit', name, url })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${name}`}
                    onClick={() => deleteLink(name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <SavedLinkDialog
        open={dialog.mode !== 'closed'}
        mode={dialog.mode === 'edit' ? 'edit' : 'add'}
        initialName={dialog.mode === 'edit' ? dialog.name : ''}
        initialUrl={dialog.mode === 'edit' ? dialog.url : dialog.mode === 'add' ? dialog.url : ''}
        onClose={() => {
          setDialog({ mode: 'closed' });
          setError(null);
        }}
        onSave={submitDialog}
      />
    </div>
  );
}
