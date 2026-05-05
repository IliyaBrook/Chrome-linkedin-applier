import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStorage } from '@/hooks/useStorage';
import { useActiveTab } from '@/hooks/useActiveTab';
import { autoApplyRunningStorage } from '@/lib/storage';
import { sendMessage } from '@/lib/messaging';

export function AutoApplyButton() {
  const { value: storedRunning, setValue: setStoredRunning } = useStorage(autoApplyRunningStorage);
  const activeTab = useActiveTab();
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const isRunning = storedRunning ?? false;

  useEffect(() => {
    if (!activeTab.id) return;
    void sendMessage('checkAutoApplyStatus', { tabId: activeTab.id })
      .then(async (response) => {
        await setStoredRunning(Boolean(response?.isRunning));
      })
      .catch(() => undefined);
  }, [activeTab.id, setStoredRunning]);

  const toggle = async () => {
    if (busy || !activeTab.id) {
      if (!activeTab.id) {
        setStatusMessage(
          'No active tabs found. Try to go to a LinkedIn job search page or refresh the page.',
        );
      }
      return;
    }
    setBusy(true);
    setStatusMessage(null);
    const action = isRunning ? 'stopAutoApply' : 'startAutoApply';
    try {
      const response = await sendMessage(action, { tabId: activeTab.id });
      if (response?.success) {
        await setStoredRunning(!isRunning);
      } else {
        await setStoredRunning(false);
        setStatusMessage(
          (response && 'message' in response ? response.message : null) ??
            'Could not toggle auto-apply.',
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatusMessage(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="lg"
        className="w-full"
        variant={isRunning ? 'destructive' : 'default'}
        onClick={toggle}
        disabled={busy}
      >
        {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {isRunning ? 'Stop Auto Apply' : 'Start Auto Apply'}
      </Button>
      {statusMessage && (
        <p className="text-center text-xs text-muted-foreground" role="status">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
