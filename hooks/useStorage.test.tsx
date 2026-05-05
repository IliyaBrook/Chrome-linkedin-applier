import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useStorage } from './useStorage';
import { savedLinksStorage } from '@/lib/storage';

describe('useStorage', () => {
  it('returns the fallback value on first render after load', async () => {
    const { result } = renderHook(() => useStorage(savedLinksStorage));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.value).toEqual({});
  });

  it('updates when setValue is called', async () => {
    const { result } = renderHook(() => useStorage(savedLinksStorage));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.setValue({ remote: 'https://example.com/jobs' });
    });
    await waitFor(() =>
      expect(result.current.value).toEqual({ remote: 'https://example.com/jobs' }),
    );
  });

  it('reflects external writes via watcher', async () => {
    const { result } = renderHook(() => useStorage(savedLinksStorage));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await savedLinksStorage.setValue({ wfh: 'https://example.com/wfh' });
    });
    await waitFor(() => expect(result.current.value).toEqual({ wfh: 'https://example.com/wfh' }));
  });
});
