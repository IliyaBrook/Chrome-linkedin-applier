import ReactDOM from 'react-dom/client';
import { ModalRoot } from '@/components/content-modals/ModalRoot';
import { autoApplyRunningStorage } from '@/lib/storage';
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
    window.runScript = () => {
      console.log('[Easy Apply LinkedIn] runScript invoked — automation logic not yet ported.');
      void autoApplyRunningStorage.setValue(true);
    };

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
  },
});
