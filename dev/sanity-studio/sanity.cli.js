import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: { projectId: '1tmgxdtl', dataset: 'development' },
  // The plugin is linked from packages/sanity: its imports of React and the
  // Studio must find this Studio's own copies.
  vite: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      dedupe: ['react', 'react-dom', 'sanity', 'styled-components', '@sanity/ui']
    }
  })
});
