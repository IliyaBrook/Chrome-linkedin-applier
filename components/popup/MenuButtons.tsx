import { ExternalLink, History, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PAGE_URLS } from '@/lib/constants';

function openPage(path: string) {
  void browser.tabs.create({ url: path });
}

export function MenuButtons() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        className="justify-start bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        onClick={() => openPage(PAGE_URLS.EXTERNAL_APPLY)}
      >
        <ExternalLink className="h-4 w-4" />
        External Apply
      </Button>
      <Button
        className="justify-start bg-slate-700 text-white shadow-sm hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500"
        onClick={() => openPage(PAGE_URLS.SETTINGS)}
      >
        <SettingsIcon className="h-4 w-4" />
        Settings
      </Button>
      <Button
        className="col-span-2 justify-start bg-amber-600 text-white shadow-sm hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
        onClick={() => openPage(PAGE_URLS.APPLY_HISTORY)}
      >
        <History className="h-4 w-4" />
        Apply History
      </Button>
    </div>
  );
}
