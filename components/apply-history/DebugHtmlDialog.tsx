import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatHtml } from '@/lib/format-html';
import { REASON_LABELS, type ApplyHistoryEntry } from '@/lib/types';

SyntaxHighlighter.registerLanguage('markup', markup);

type Props = {
  entry: ApplyHistoryEntry | null;
  onClose: () => void;
};

export function DebugHtmlDialog({ entry, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const formatted = useMemo(() => {
    if (!entry?.debugHtml) return '';
    try {
      return formatHtml(entry.debugHtml);
    } catch {
      return entry.debugHtml;
    }
  }, [entry]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const open = !!entry;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex h-[85vh] max-h-[85vh] w-[min(95vw,1100px)] max-w-none flex-col gap-3">
        <DialogHeader className="space-y-1">
          <DialogTitle>Debug snapshot</DialogTitle>
          <DialogDescription>
            HTML captured from the page when the entry was recorded — useful for understanding
            why the script could not interact with the job card.
          </DialogDescription>
        </DialogHeader>

        {entry ? (
          <div className="grid gap-2 text-xs">
            <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
              <span className="text-muted-foreground">Reason</span>
              <span className="font-medium">{REASON_LABELS[entry.reason] ?? entry.reason}</span>
              <span className="text-muted-foreground">Title</span>
              <span>{entry.title || '—'}</span>
              <span className="text-muted-foreground">Company</span>
              <span>{entry.companyName || '—'}</span>
              {entry.description ? (
                <>
                  <span className="text-muted-foreground">Note</span>
                  <span>{entry.description}</span>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatted ? `${formatted.length.toLocaleString()} chars` : 'No snapshot'}
          </span>
          <Button size="sm" variant="outline" onClick={onCopy} disabled={!formatted}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy HTML'}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-[#282c34]">
          {formatted ? (
            <SyntaxHighlighter
              language="markup"
              style={oneDark}
              wrapLongLines
              customStyle={{
                margin: 0,
                padding: '12px',
                background: 'transparent',
                fontSize: '12px',
                lineHeight: '1.5',
              }}
              codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, monospace' } }}
            >
              {formatted}
            </SyntaxHighlighter>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No HTML was captured for this entry.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
