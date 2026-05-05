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
        variant="secondary"
        className="justify-start"
        onClick={() => openPage(PAGE_URLS.EXTERNAL_APPLY)}
      >
        <ExternalLink className="h-4 w-4" />
        External Apply
      </Button>
      <Button
        variant="secondary"
        className="justify-start"
        onClick={() => openPage(PAGE_URLS.SETTINGS)}
      >
        <SettingsIcon className="h-4 w-4" />
        Settings
      </Button>
      <Button
        variant="secondary"
        className="col-span-2 justify-start"
        onClick={() => openPage(PAGE_URLS.APPLY_HISTORY)}
      >
        <History className="h-4 w-4" />
        Apply History
      </Button>
    </div>
  );
}
