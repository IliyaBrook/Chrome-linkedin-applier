import ReactDOM from 'react-dom/client';
import { ModalRoot } from '@/components/content-modals/ModalRoot';
import { ContentRunState } from './run-state';
import { runScript } from './run-script';
import { aaError } from './dom-utils';
import './style.css';

declare global {
  interface Window {
    runScript?: () => void;
  }
}

export default defineContentScript({
  matches: ['*://*.linkedin.com/*'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    const state = new ContentRunState();

    window.runScript = () => {
      void runScript(state).catch((error) => {
        aaError('runScript invocation failed', error);
      });
    };

    const onBeforeUnload = () => {
      try {
        if (!state.isExtensionContextValidQuiet()) return;
        state.stopExtensionContextMonitoring();
      } catch {
        // ignore unload-time errors
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    const ui = await createShadowRootUi(ctx, {
      name: 'easy-apply-linkedin-modals',
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount: (container) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'eal-root';
        container.appendChild(wrapper);
        const root = ReactDOM.createRoot(wrapper);
        root.render(<ModalRoot />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });
    ui.mount();

    ctx.onInvalidated(() => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      state.stopExtensionContextMonitoring();
    });
  },
});
