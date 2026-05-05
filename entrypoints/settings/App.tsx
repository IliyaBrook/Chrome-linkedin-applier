import { Database, FileText, Filter, FormInput, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLayout } from '@/components/page/PageLayout';
import { PAGE_URLS } from '@/lib/constants';
import { getAllStorage, setAllStorage } from '@/lib/storage';
import { useRef, useState } from 'react';

function openPage(path: string) {
  void browser.tabs.create({ url: path });
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function exportFilename(date: Date = new Date()): string {
  return `autoapply_settings_${pad(date.getDate())}_${pad(date.getMonth() + 1)}_[${pad(date.getHours())}_${pad(date.getMinutes())}].json`;
}

async function downloadSettings() {
  const data = await getAllStorage();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const cards = [
  {
    title: 'Form Control',
    description: 'Default personal info, learned answers, radios, dropdowns.',
    icon: FormInput,
    href: PAGE_URLS.FORM_CONTROL,
  },
  {
    title: 'Filter Settings',
    description: 'Bad-word, must-contain, and must-skip filters for jobs.',
    icon: Filter,
    href: PAGE_URLS.FILTER_SETTINGS,
  },
  {
    title: 'CV Files',
    description: 'Manage CVs and per-CV filters used during apply.',
    icon: FileText,
    href: PAGE_URLS.CV_MANAGER,
  },
];

export default function App() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const onImport = (file: File | null) => {
    if (!file) return;
    setImportStatus(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = String(e.target?.result ?? '');
        const data = JSON.parse(text) as Record<string, unknown>;
        await setAllStorage(data);
        setImportStatus('Settings imported successfully!');
      } catch (err) {
        setImportStatus(
          err instanceof Error ? `Import failed: ${err.message}` : 'Import failed.',
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <PageLayout
      title="Settings"
      description="Configure your AutoApply extension."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ title, description, icon: Icon, href }) => (
          <Card key={title} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex-row items-start gap-3">
              <Icon className="h-6 w-6 text-primary" />
              <div className="flex flex-1 flex-col gap-1">
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => openPage(href)}>
                Open
              </Button>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="flex-row items-start gap-3">
            <Database className="h-6 w-6 text-primary" />
            <div className="flex flex-1 flex-col gap-1">
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Export the full storage state or import from a JSON file.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => void downloadSettings()}>
              <Download className="h-4 w-4" />
              Export settings
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import settings
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => onImport(e.target.files?.[0] ?? null)}
            />
            {importStatus && (
              <p
                className="text-xs text-muted-foreground"
                role={importStatus.startsWith('Import failed') ? 'alert' : 'status'}
              >
                {importStatus}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
