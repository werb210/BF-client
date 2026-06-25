import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.boreal.client',
  appName: 'Boreal Financial',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  ios: { path: '../ios', scheme: 'BorealClient', contentInset: 'always' },
  android: { path: '../android', allowMixedContent: true }
};

export default config;
