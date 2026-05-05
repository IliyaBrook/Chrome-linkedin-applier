import { useEffect, useState } from 'react';

export type ActiveTabInfo = {
  id: number | null;
  url: string;
};

export function useActiveTab(): ActiveTabInfo {
  const [tab, setTab] = useState<ActiveTabInfo>({ id: null, url: '' });

  useEffect(() => {
    let cancelled = false;
    void browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (cancelled) return;
      const active = tabs?.[0];
      setTab({ id: active?.id ?? null, url: active?.url ?? '' });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return tab;
}
