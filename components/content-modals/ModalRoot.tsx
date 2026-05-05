import { useEffect, useState } from 'react';
import { onMessage, sendMessage } from '@/lib/messaging';
import { autoApplyRunningStorage } from '@/lib/storage';
import { FormControlModal } from './FormControlModal';
import { NotOnJobSearchModal } from './NotOnJobSearchModal';
import { RunningModal } from './RunningModal';

export function ModalRoot() {
  const [showNotOnJobs, setShowNotOnJobs] = useState(false);
  const [showFormControl, setShowFormControl] = useState(false);
  const [showRunning, setShowRunning] = useState(false);

  useEffect(() => {
    const offNotOnJobs = onMessage('showNotOnJobSearchAlert', () => {
      setShowNotOnJobs(true);
      return { success: true };
    });
    const offFormControl = onMessage('showFormControlAlert', () => {
      setShowFormControl(true);
      return { success: true };
    });
    const offShowRunning = onMessage('showRunningModal', () => {
      setShowRunning(true);
      return { success: true } as const;
    });
    const offHideRunning = onMessage('hideRunningModal', () => {
      setShowRunning(false);
      return { success: true };
    });
    const offCheckRunning = onMessage('checkScriptRunning', async () => {
      const running = await autoApplyRunningStorage.getValue();
      return { isRunning: Boolean(running) };
    });
    const offGetUrl = onMessage('getCurrentUrl', () => ({ url: window.location.href }));

    return () => {
      offNotOnJobs();
      offFormControl();
      offShowRunning();
      offHideRunning();
      offCheckRunning();
      offGetUrl();
    };
  }, []);

  const onStop = async () => {
    setShowRunning(false);
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs?.[0]?.id;
      if (tabId != null) {
        await sendMessage('stopAutoApply', { tabId });
      }
    } catch {
      // background not reachable — local close already happened
    }
  };

  return (
    <>
      <NotOnJobSearchModal open={showNotOnJobs} onClose={() => setShowNotOnJobs(false)} />
      <FormControlModal open={showFormControl} onClose={() => setShowFormControl(false)} />
      <RunningModal open={showRunning} onStop={() => void onStop()} />
    </>
  );
}
