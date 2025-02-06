import { init, loadRemote, registerRemotes } from '@module-federation/enhanced/runtime';

init({
  name: 'social_mini_app',
  remotes: [],
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true }
  },
} as any);


export { loadRemote, registerRemotes };