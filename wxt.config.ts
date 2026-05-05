import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Easy Apply LinkedIn (WXT dev)',
    description: 'Applying for Jobs Made Effortless!',
    version: '0.1.0',
    permissions: ['tabs', 'storage', 'activeTab', 'scripting'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'CONFIGURATION',
    },
  },
});
