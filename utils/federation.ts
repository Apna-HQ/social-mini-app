import { init, loadRemote, registerRemotes } from '@module-federation/enhanced/runtime';

init({
  name: 'social_mini_app',
  remotes: [
    {
      name: 'apna_module_test',
      entry: 'https://cdn.jsdelivr.net/npm/@nandubatchu/apna-module-test@1.0.6/dist/mf-manifest.json'
    },
    {
      name: 'test_provider',
      entry: 'http://localhost:3004/remoteEntry.js'
    }
  ],
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true }
  },
} as any);


export { loadRemote, registerRemotes };