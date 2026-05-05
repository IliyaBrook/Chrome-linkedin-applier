import { useEffect, useState } from 'react';
import type { WxtStorageItem } from 'wxt/utils/storage';

export function useStorage<T>(item: WxtStorageItem<T, Record<string, unknown>>): {
  value: T | null;
  setValue: (next: T) => Promise<void>;
  loading: boolean;
} {
  const [value, setLocalValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void item.getValue().then((v) => {
      if (!cancelled) {
        setLocalValue(v);
        setLoading(false);
      }
    });
    const unwatch = item.watch((next) => {
      setLocalValue(next);
    });
    return () => {
      cancelled = true;
      unwatch();
    };
  }, [item]);

  const setValue = async (next: T) => {
    await item.setValue(next);
  };

  return { value, setValue, loading };
}
